import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  MessageCircle, Upload, Image, Video, Music, Paperclip,
  Play, Pause, Square, Clock, Users, Phone, AlertTriangle,
  CheckCircle2, FileSpreadsheet, Tag, Filter, X, ChevronRight,
  Zap, Timer, SkipForward, Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/LoadingSkeleton';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Fonte = 'funil' | 'etiqueta' | 'planilha';
type StatusDisparo = 'idle' | 'running' | 'paused' | 'done';
type TipoMedia = 'imagem' | 'video' | 'audio' | 'arquivo';

interface LeadDisparo {
  id: string;
  nome: string;
  telefone: string | null;
  momento_funil: string | null;
}

interface MediaAnexo {
  tipo: TipoMedia;
  arquivo: File;
  preview?: string;
}

const MOMENTOS_FUNIL = ['Pre Orçamento', 'Pos Orçamento', 'Pos Venda'];

const TIPO_MEDIA_CONFIG: Record<TipoMedia, { icon: React.ElementType; label: string; accept: string; color: string }> = {
  imagem:  { icon: Image,      label: 'Imagem',    accept: 'image/*',                    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  video:   { icon: Video,      label: 'Vídeo',     accept: 'video/*',                    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  audio:   { icon: Music,      label: 'Áudio',     accept: 'audio/*',                    color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  arquivo: { icon: Paperclip,  label: 'Arquivo',   accept: '.pdf,.doc,.docx,.xls,.xlsx', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function estimarTempo(total: number, min: number, max: number): string {
  if (total === 0) return '—';
  const media = (min + max) / 2;
  const totalSec = Math.round(total * media);
  return formatTime(totalSec);
}

function whatsappLink(telefone: string, mensagem: string): string {
  const num = telefone.replace(/\D/g, '');
  return `https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`;
}

// ─── Parser CSV simples ───────────────────────────────────────────────────────

function parseCSV(text: string): LeadDisparo[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const nomeIdx = header.findIndex(h => h.includes('nome'));
  const telIdx  = header.findIndex(h => h.includes('tel') || h.includes('fone') || h.includes('whatsapp'));
  if (nomeIdx === -1) return [];

  return lines.slice(1).map((line, i) => {
    const cols = line.split(/[;,]/).map(c => c.trim().replace(/['"]/g, ''));
    return {
      id:           `csv-${i}`,
      nome:         cols[nomeIdx] ?? '',
      telefone:     telIdx !== -1 ? cols[telIdx] ?? null : null,
      momento_funil: null,
    };
  }).filter(l => l.nome);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DisparoEmMassa() {
  const { empresa } = useEmpresa();

  // ── Fonte ──
  const [fonte, setFonte] = useState<Fonte>('funil');
  const [filtroFunil, setFiltroFunil] = useState<string[]>([]);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [csvLeads, setCsvLeads] = useState<LeadDisparo[]>([]);
  const [waLeads, setWaLeads] = useState<LeadDisparo[]>([]);
  const [loadingWa, setLoadingWa] = useState(false);
  const [downloadingWa, setDownloadingWa] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsDB, setLeadsDB] = useState<LeadDisparo[]>([]);

  // ── Mensagem ──
  const [mensagem, setMensagem] = useState('');
  const [legenda, setLegenda] = useState('');
  const [mediaAnexo, setMediaAnexo] = useState<MediaAnexo | null>(null);
  const [tipoMediaSelecionado, setTipoMediaSelecionado] = useState<TipoMedia>('imagem');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef  = useRef<HTMLInputElement>(null);

  // ── Timing ──
  const [minDelay, setMinDelay] = useState(60);
  const [maxDelay, setMaxDelay] = useState(120);

  // ── Disparo ──
  const [status, setStatus]         = useState<StatusDisparo>('idle');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [countdown, setCountdown]   = useState(0);
  const [enviados, setEnviados]     = useState(0);
  const [pulados, setPulados]       = useState(0);
  const nextDelayRef = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipRef      = useRef(false);

  // ── Leads calculados ──────────────────────────────────────────────────────

  const leads: LeadDisparo[] = fonte === 'planilha'
    ? csvLeads
    : fonte === 'etiqueta'
    ? waLeads
    : leadsDB.filter(l => {
        if (fonte === 'funil') {
          return filtroFunil.length === 0 || filtroFunil.includes(l.momento_funil ?? '');
        }
        return true;
      });

  const leadsComTelefone    = leads.filter(l => l.telefone);
  const leadsSemTelefone    = leads.filter(l => !l.telefone);
  const totalEstimado       = estimarTempo(leadsComTelefone.length, minDelay, maxDelay);

  // ── Fetch contatos WhatsApp via webhook ───────────────────────────────────

  const fetchWaContatos = useCallback(async () => {
    if (!empresa) return;
    setLoadingWa(true);
    setWaError(null);
    try {
      const res = await fetch('https://n8n-latest-phwy.onrender.com/webhook/22ae62a1-a9c6-4f78-97bb-c860a9522ef0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_empresa: empresa.nome_empresa,
          id_empresa: empresa.id,
          telefone_empresa: empresa.telefone ?? null,
        }),
      });
      const json = await res.json();
      // Se retornar mensagem de erro (não é Pro)
      if (json?.erro || json?.message || typeof json === 'string') {
        setWaError(json?.erro ?? json?.message ?? String(json));
        setWaLeads([]);
      } else {
        // Espera array de { nome, telefone }
        const lista: LeadDisparo[] = (Array.isArray(json) ? json : json?.contatos ?? []).map((c: any, i: number) => ({
          id: `wa-${i}`,
          nome: c.nome ?? c.name ?? '',
          telefone: c.telefone ?? c.phone ?? c.number ?? null,
          momento_funil: null,
        })).filter((l: LeadDisparo) => l.nome);
        setWaLeads(lista);
      }
    } catch (err) {
      setWaError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoadingWa(false);
    }
  }, [empresa]);

  // ── Download contatos WhatsApp ────────────────────────────────────────────

  const downloadWaContatos = useCallback(async () => {
  if (!empresa) return;
  setDownloadingWa(true);
  try {
    // IMPORTANTE: Use a Production URL do Webhook, não a URL de test
    const res = await fetch('https://n8n-latest-phwy.onrender.com/webhook/a34ef39a-c8cb-40ef-827e-2d8df9eb4ab2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_empresa: empresa.nome_empresa,
        id_empresa: empresa.id,
        telefone_empresa: empresa.telefone ?? null,
      }),
    });

    if (!res.ok) throw new Error('Falha na resposta do servidor');

    const blob = await res.blob();
    // Força o download automático usando a API de Blob do navegador
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // O nome do arquivo será definido pelo cabeçalho Content-Disposition do n8n
    a.download = `contatos-${empresa.nome_empresa}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Download iniciado!');
  } catch (err) {
    toast.error('Erro ao fazer download.');
  } finally {
    setDownloadingWa(false);
  }
}, [empresa]);

  // ── Fetch leads do banco ──────────────────────────────────────────────────

  useEffect(() => {
    if (!empresa || fonte === 'planilha') return;
    setLoadingLeads(true);
    supabase
      .from('leads')
      .select('id, nome, telefone, momento_funil')
      .eq('id_empresa', empresa.id)
      .order('nome')
      .then(({ data }) => {
        setLeadsDB((data ?? []) as LeadDisparo[]);
        setLoadingLeads(false);
      });
  }, [empresa, fonte]);

  // ── Upload CSV ────────────────────────────────────────────────────────────

  const handleCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsvLeads(parsed);
      toast.success(`${parsed.length} contatos importados da planilha`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleCSV(file);
  };

  // ── Upload mídia ──────────────────────────────────────────────────────────

  const handleMedia = (file: File) => {
    const preview = tipoMediaSelecionado === 'imagem' ? URL.createObjectURL(file) : undefined;
    setMediaAnexo({ tipo: tipoMediaSelecionado, arquivo: file, preview });
  };

  // ── Validações ────────────────────────────────────────────────────────────

  const minValido  = minDelay >= 60;
  const maxValido  = maxDelay >= minDelay;
  const podeComecar = leadsComTelefone.length > 0 && mensagem.trim().length > 0 && minValido && maxValido && status === 'idle';

  // ── Lógica de disparo ─────────────────────────────────────────────────────

  const avancarLead = useCallback(() => {
    setCurrentIdx(prev => {
      const next = prev + 1;
      if (next >= leadsComTelefone.length) {
        setStatus('done');
        return prev;
      }
      const delay = randomDelay(minDelay, maxDelay);
      nextDelayRef.current = delay;
      setCountdown(delay);
      skipRef.current = false;
      return next;
    });
  }, [leadsComTelefone.length, minDelay, maxDelay]);

  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (skipRef.current) {
        skipRef.current = false;
        setPulados(p => p + 1);
        avancarLead();
        return;
      }
      setCountdown(prev => {
        if (prev <= 1) {
          setEnviados(e => e + 1);
          avancarLead();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, avancarLead]);

  const iniciarDisparo = async () => {
    setCurrentIdx(0);
    setEnviados(0);
    setPulados(0);
    setStatus('running');
    setCountdown(randomDelay(minDelay, maxDelay));
    skipRef.current = false;

    if (empresa) {
      try {
        // 1. CRIA O FORM DATA (Isso é obrigatório para enviar arquivos)
        const formData = new FormData();
        formData.append('nome_empresa', empresa.nome_empresa);
        formData.append('id_empresa', empresa.id);
        formData.append('telefone_empresa', empresa.telefone ?? '');
        formData.append('mensagem', mensagem);
        // Enviando a lista de contatos como string para ser parseada no n8n
        formData.append('contatos', JSON.stringify(leadsComTelefone));
        formData.append('minDelay', minDelay.toString());
        formData.append('maxDelay', maxDelay.toString());
        
        // 2. SE TIVER MÍDIA, ADICIONA AO FORM DATA
        if (mediaAnexo) {
          formData.append('anexo', mediaAnexo.arquivo);
          formData.append('legenda', legenda);
        }

        // 3. FETCH SEM O HEADER "Content-Type"
        // O navegador detecta o FormData e coloca o "multipart/form-data" sozinho
        await fetch('https://n8n-latest-phwy.onrender.com/webhook-test/2fda6587-3087-4d16-a5eb-424cb3b39542', {
          method: 'POST',
          body: formData 
        });
        
        console.log("Disparo enviado com sucesso!");
      } catch (err) {
        console.error("Erro no disparo:", err);
      }
    }
  };

  const pausarDisparo  = () => setStatus('paused');
  const retomarDisparo = () => setStatus('running');
  const pararDisparo   = () => { setStatus('idle'); setCurrentIdx(0); setCountdown(0); };
  const pularLead      = () => { skipRef.current = true; };

  const leadAtual = leadsComTelefone[currentIdx];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-green-400" />
            Disparo em Massa
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Envie mensagens para múltiplos contatos com intervalo aleatório seguro
          </p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
          <MessageCircle className="h-3 w-3" /> WhatsApp Manual
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── COLUNA ESQUERDA (config) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── PASSO 1: Fonte ────────────────────────────────────────────── */}
          <div className="metric-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">1</div>
              <h3 className="font-display font-semibold text-foreground">Fonte dos Contatos</h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
              {([
                { id: 'funil',    label: 'Funil Higi$Controle', icon: Filter },
                { id: 'etiqueta', label: 'Contato WhatsApp',   icon: Tag },
                { id: 'planilha', label: 'Planilha',       icon: FileSpreadsheet },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setFonte(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    fonte === t.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Funil */}
            {fonte === 'funil' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecione os momentos do funil (vazio = todos):</p>
                <div className="flex flex-wrap gap-2">
                  {MOMENTOS_FUNIL.map(m => (
                    <button
                      key={m}
                      onClick={() => setFiltroFunil(prev =>
                        prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                      )}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        filtroFunil.includes(m)
                          ? 'bg-primary/15 border-primary/50 text-primary'
                          : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {filtroFunil.includes(m) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                      {m}
                    </button>
                  ))}
                </div>
                {loadingLeads && <p className="text-xs text-muted-foreground animate-pulse">Carregando leads...</p>}
              </div>
            )}

            {/* Contato WhatsApp */}
            {fonte === 'etiqueta' && (
              <div className="space-y-4">
                {/* Aviso anti-banimento */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-amber-400">⚠️ Práticas Anti-Banimento</p>
                    <ul className="text-xs text-amber-300/80 space-y-1 list-disc list-inside">
                      <li>Acima de 300 contatos, <strong className="text-amber-400">use o download em lotes</strong> para evitar ban</li>
                      <li>Envie no máximo 150–200 mensagens por dia por número</li>
                      <li>Prefira intervalos maiores (acima de 90s) para listas grandes</li>
                      <li>Varie o texto da mensagem entre lotes diferentes</li>
                      <li>Use o arquivo baixado na aba <strong className="text-amber-400">Planilha</strong> para fatiar e enviar por partes</li>
                    </ul>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-primary/40 text-primary hover:bg-primary/10"
                    onClick={fetchWaContatos}
                    disabled={loadingWa}
                  >
                    {loadingWa ? (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    {loadingWa ? 'Carregando...' : 'Carregar Contatos'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-green-500/40 text-green-400 hover:bg-green-500/10"
                    onClick={downloadWaContatos}
                    disabled={downloadingWa}
                  >
                    {downloadingWa ? (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    )}
                    {downloadingWa ? 'Baixando...' : 'Download CSV'}
                  </Button>
                </div>

                {/* Erro / mensagem Pro */}
                {waError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{waError}</p>
                  </div>
                )}

                {/* Dica de download */}
                {waLeads.length > 200 && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">
                      <strong>{waLeads.length} contatos detectados.</strong> Recomendamos fazer o <strong>Download CSV</strong>, fatiar a lista em partes de até 200 e enviar cada parte pela aba <strong>Planilha</strong> em dias diferentes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Planilha */}
            {fonte === 'planilha' && (
              <div className="space-y-3">
                <div
                  onDrop={handleCSVDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => csvInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-foreground font-medium">Arraste o arquivo ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV ou XLSX · Colunas: nome, telefone</p>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])}
                  />
                </div>
                {csvLeads.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <span className="text-xs text-green-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                      {csvLeads.length} contatos importados
                    </span>
                    <button onClick={() => setCsvLeads([])} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PASSO 2: Mensagem ─────────────────────────────────────────── */}
          <div className="metric-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">2</div>
              <h3 className="font-display font-semibold text-foreground">Mensagem</h3>
            </div>

            {/* Texto */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Texto da Mensagem *
              </label>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={5}
                placeholder="Olá {nome}! 👋&#10;&#10;Use {nome} para personalizar com o nome do contato."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-secondary text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                Variável disponível: <code className="text-primary">{'{nome}'}</code> — substituído pelo nome do contato
              </p>
            </div>

            {/* Mídia */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                Anexo (opcional)
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40">Requer WA API Pro</Badge>
              </label>

              {/* Tipo de mídia */}
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(TIPO_MEDIA_CONFIG) as [TipoMedia, typeof TIPO_MEDIA_CONFIG[TipoMedia]][]).map(([tipo, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={tipo}
                      onClick={() => setTipoMediaSelecionado(tipo)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        tipoMediaSelecionado === tipo
                          ? cfg.color
                          : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Upload da mídia */}
              {mediaAnexo ? (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                  {mediaAnexo.preview ? (
                    <img src={mediaAnexo.preview} alt="preview" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className={`h-12 w-12 rounded flex items-center justify-center flex-shrink-0 ${TIPO_MEDIA_CONFIG[mediaAnexo.tipo].color}`}>
                      {(() => { const Icon = TIPO_MEDIA_CONFIG[mediaAnexo.tipo].icon; return <Icon className="h-5 w-5" />; })()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{mediaAnexo.arquivo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(mediaAnexo.arquivo.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button onClick={() => setMediaAnexo(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar {TIPO_MEDIA_CONFIG[tipoMediaSelecionado].label}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={TIPO_MEDIA_CONFIG[tipoMediaSelecionado].accept}
                className="hidden"
                onChange={e => e.target.files?.[0] && handleMedia(e.target.files[0])}
              />

              {/* Legenda */}
              {mediaAnexo && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Legenda</label>
                  <Input
                    value={legenda}
                    onChange={e => setLegenda(e.target.value)}
                    placeholder="Legenda do arquivo (opcional)"
                    className="bg-secondary border-border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── PASSO 3: Timing ───────────────────────────────────────────── */}
          <div className="metric-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">3</div>
              <h3 className="font-display font-semibold text-foreground">Intervalo entre Envios</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Mínimo (segundos)
                </label>
                <Input
                  type="number"
                  min={60}
                  value={minDelay}
                  onChange={e => {
                    const v = Math.max(60, parseInt(e.target.value) || 60);
                    setMinDelay(v);
                    if (maxDelay < v) setMaxDelay(v);
                  }}
                  className={`bg-secondary border-border ${!minValido ? 'border-destructive' : ''}`}
                />
                {!minValido && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Mínimo de 60 segundos
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Máximo (segundos)
                </label>
                <Input
                  type="number"
                  min={minDelay}
                  value={maxDelay}
                  onChange={e => setMaxDelay(Math.max(minDelay, parseInt(e.target.value) || minDelay))}
                  className={`bg-secondary border-border ${!maxValido ? 'border-destructive' : ''}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Intervalo aleatório entre <strong className="text-foreground">{formatTime(minDelay)}</strong> e <strong className="text-foreground">{formatTime(maxDelay)}</strong> por mensagem
                </p>
                {leadsComTelefone.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tempo total estimado para {leadsComTelefone.length} contatos: <strong className="text-primary">{totalEstimado}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUNA DIREITA (preview + controle) ─────────────────────────── */}
        <div className="space-y-4">

          {/* Preview de contatos */}
          <div className="metric-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Contatos
              </h3>
              <Badge variant="outline" className="text-xs">
                {leadsComTelefone.length} válidos
              </Badge>
            </div>

            {leadsSemTelefone.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  {leadsSemTelefone.length} contato{leadsSemTelefone.length !== 1 ? 's' : ''} sem telefone serão ignorados
                </p>
              </div>
            )}

            {leadsComTelefone.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {fonte === 'planilha'
                    ? 'Importe uma planilha para ver os contatos'
                    : 'Selecione os filtros acima'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {leadsComTelefone.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      status === 'running' && i === currentIdx
                        ? 'bg-green-500/15 border border-green-500/30'
                        : status !== 'idle' && i < currentIdx
                        ? 'opacity-40'
                        : 'bg-secondary/50'
                    }`}
                  >
                    {status !== 'idle' && i < currentIdx && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    )}
                    {status === 'running' && i === currentIdx && (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-green-400 border-t-transparent animate-spin flex-shrink-0" />
                    )}
                    {(status === 'idle' || (status !== 'idle' && i > currentIdx)) && (
                      <div className="h-3.5 w-3.5 rounded-full bg-border flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{l.nome}</p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />{l.telefone}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Controle de Disparo ─────────────────────────────────────── */}
          <div className="metric-card space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              Controle de Disparo
            </h3>

            {/* Idle */}
            {status === 'idle' && (
              <div className="space-y-3">
                {!mensagem.trim() && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-400" /> Escreva a mensagem antes de iniciar
                  </p>
                )}
                {leadsComTelefone.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-400" /> Selecione contatos com telefone
                  </p>
                )}
                <Button
                  className="w-full gap-2 bg-green-500 hover:bg-green-400 text-black font-semibold"
                  onClick={iniciarDisparo}
                  disabled={!podeComecar}
                >
                  <Play className="h-4 w-4" />
                  Iniciar Disparo ({leadsComTelefone.length} contatos)
                </Button>
              </div>
            )}

            {/* Running / Paused */}
            {(status === 'running' || status === 'paused') && (
              <div className="space-y-4">
                {/* Lead atual */}
                {leadAtual && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Enviando para</p>
                    <p className="font-semibold text-foreground">{leadAtual.nome}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {leadAtual.telefone}
                    </p>
                  </div>
                )}

                {/* Progresso */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{currentIdx + 1} de {leadsComTelefone.length}</span>
                    <span>{Math.round(((currentIdx) / leadsComTelefone.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      animate={{ width: `${(currentIdx / leadsComTelefone.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Countdown */}
                {status === 'running' && (
                  <div className="flex items-center justify-center gap-2 py-2 bg-secondary rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-mono text-xl font-bold text-foreground tabular-nums">
                      {formatTime(countdown)}
                    </span>
                    <span className="text-xs text-muted-foreground">próximo envio</span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-secondary/50 rounded-lg py-2">
                    <p className="font-bold text-green-400 text-lg">{enviados}</p>
                    <p className="text-[10px] text-muted-foreground">Enviados</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg py-2">
                    <p className="font-bold text-amber-400 text-lg">{pulados}</p>
                    <p className="text-[10px] text-muted-foreground">Pulados</p>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-2">
                  {status === 'running' ? (
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={pausarDisparo}>
                      <Pause className="h-4 w-4" /> Pausar
                    </Button>
                  ) : (
                    <Button className="flex-1 gap-1.5 bg-green-500 hover:bg-green-400 text-black" onClick={retomarDisparo}>
                      <Play className="h-4 w-4" /> Retomar
                    </Button>
                  )}
                  <Button variant="outline" size="icon" onClick={pularLead} title="Pular este contato">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={pararDisparo}
                    title="Parar disparo"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Done */}
            {status === 'done' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="font-display font-bold text-foreground text-lg">Disparo concluído!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {enviados} enviados · {pulados} pulados
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={pararDisparo}>
                  Novo Disparo
                </Button>
              </div>
            )}
          </div>

          {/* Aviso de responsabilidade */}
          <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              O sistema abre o WhatsApp para cada contato com o intervalo configurado.
              O envio da mensagem é manual por segurança. Intervalo mínimo de 60s reduz
              risco de bloqueio pelo WhatsApp.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}