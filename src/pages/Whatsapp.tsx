import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Zap, Lock, CheckCircle2,
  ArrowRight, Send, Star, User, Search, AlertCircle, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLeads } from '@/hooks/useLeads';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useCadenciaLeads } from '@/hooks/useCadenciaLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const TIPO_ICONS: Record<string, { icon: string; color: string }> = {
  follow_up_pre_orcamento: { icon: '💬', color: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
  follow_up_pos_orcamento: { icon: '🔁', color: 'border-purple-500/30 bg-purple-500/5 text-purple-400' },
  lembrete_agendamento:    { icon: '📅', color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400' },
  pos_venda:               { icon: '⭐', color: 'border-green-500/30 bg-green-500/5 text-green-400' },
};

const TIPO_LABELS: Record<string, string> = {
  follow_up_pre_orcamento: 'Follow-up Pré-orçamento',
  follow_up_pos_orcamento: 'Follow-up Pós-orçamento',
  lembrete_agendamento:    'Lembrete de Agendamento',
  pos_venda:               'Pós-venda',
};

const PLAN_FEATURES = [
  { text: 'Atendimento automático 24h no WhatsApp', pro: true },
  { text: 'Cadastro automático de novos clientes', pro: true },
  { text: 'Follow-up automático pós-mensagem', pro: true },
  { text: 'Lembrete de agendamento automático', pro: true },
  { text: 'Pós-venda automático', pro: true },
  { text: 'Confirmação e remarcação de serviços', pro: true },
  { text: 'Envio manual via link para o cliente', pro: false },
  { text: 'Mensagens das suas regras de cadência', pro: false },
];

interface Regra {
  id: string;
  tipo_lembrete: string;
  cadencia_envio: number;
  template_mensagem: string | null;
}

function whatsappLink(telefone: string | null, mensagem: string) {
  const num = (telefone || '').replace(/\D/g, '');
  return `https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`;
}

export default function Whatsapp() {
  const { leads } = useLeads();
  const { empresa } = useEmpresa();
  const [search, setSearch] = useState('');
  const [selectedRegra, setSelectedRegra] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  // Mapa de cadência: leadId → { mensagem, tipo, label } | null
  const { data: cadenciaMap = new Map() } = useCadenciaLeads(leads);

  // Regras criadas pelo usuário
  const { data: regras = [], isLoading: loadingRegras } = useQuery({
    queryKey: ['regras-whatsapp', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data } = await supabase
        .from('regras_automacoes')
        .select('id, tipo_lembrete, cadencia_envio, template_mensagem')
        .eq('id_empresa', empresa.id)
        .order('data_criacao', { ascending: false });
      return (data ?? []) as Regra[];
    },
    enabled: !!empresa,
  });

  const regraAtual = regras.find(r => r.id === selectedRegra) ?? null;
  const leadAtual  = leads.find(l => l.id === selectedLead) ?? null;

  // ── Lógica de filtro bidirecional ────────────────────────────────────────────

  // Regras visíveis:
  // • Sem lead selecionado → mostra todas
  // • Com lead selecionado → destaca só as que se aplicam ao lead HOJE
  const regrasComStatus = useMemo(() => {
    return regras.map(r => {
      if (!leadAtual) return { regra: r, ativa: true };
      const cadencia = cadenciaMap.get(leadAtual.id);
      const ativa = !!cadencia && cadencia.tipo === r.tipo_lembrete;
      return { regra: r, ativa };
    });
  }, [regras, leadAtual, cadenciaMap]);

  // Leads visíveis na busca:
  // • Sem regra selecionada → todos que batem com a busca
  // • Com regra selecionada → filtra só os que têm cadência ativa desse tipo
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lista = leads.filter(l => {
      if (!q) return false; // só mostra ao digitar
      return l.nome.toLowerCase().includes(q) || l.telefone?.includes(q);
    });
    if (!regraAtual) return lista.slice(0, 8);
    // Com regra selecionada: filtra leads que têm cadência ativa do mesmo tipo
    return lista
      .filter(l => cadenciaMap.get(l.id)?.tipo === regraAtual.tipo_lembrete)
      .slice(0, 8);
  }, [leads, search, regraAtual, cadenciaMap]);

  // Mensagem final: só gera se a regra se aplica ao lead HOJE
  const cadenciaDoLead = leadAtual ? cadenciaMap.get(leadAtual.id) : null;
  const regraAplicavel = regraAtual && cadenciaDoLead?.tipo === regraAtual.tipo_lembrete;
  const mensagem = regraAplicavel && leadAtual ? cadenciaDoLead!.mensagem : null;

  // Limpa seleção de lead ao trocar regra
  const handleSelectRegra = (id: string) => {
    setSelectedRegra(prev => prev === id ? null : id);
    setSelectedLead(null);
    setSearch('');
  };

  const handleSelectLead = (id: string) => {
    setSelectedLead(id);
    setSearch('');
  };

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  // Contagem de leads elegíveis por regra (para badge)
  const elegibilidadePorRegra = useMemo(() => {
    const map: Record<string, number> = {};
    regras.forEach(r => {
      map[r.id] = leads.filter(l => cadenciaMap.get(l.id)?.tipo === r.tipo_lembrete).length;
    });
    return map;
  }, [regras, leads, cadenciaMap]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">

      {/* Header */}
      <motion.div variants={item} className="metric-card border-green-500/30 bg-green-500/5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-foreground mb-1">Integração WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Selecione uma regra → aparecem os leads elegíveis hoje. Selecione o lead → só a mensagem da cadência dele fica ativa.
            </p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs flex-shrink-0">
            Manual ativo
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Envio Manual */}
        <motion.div variants={item} className="space-y-4">
          <h3 className="font-display font-semibold text-foreground">Envio Manual</h3>

          {/* Regras */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Regra de Cadência
            </label>

            {loadingRegras && (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-12 bg-card animate-pulse rounded-lg" />)}
              </div>
            )}

            {!loadingRegras && regras.length === 0 && (
              <div className="metric-card border-dashed flex flex-col items-center py-6 text-center gap-2">
                <RotateCcw className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma regra criada ainda</p>
                <Link to="/automacoes">
                  <Button size="sm" variant="outline" className="gap-1 mt-1">
                    Criar regras de cadência →
                  </Button>
                </Link>
              </div>
            )}

            {regras.length > 0 && (
              <div className="space-y-2">
                {regrasComStatus.map(({ regra: r, ativa }) => {
                  const tipoInfo = TIPO_ICONS[r.tipo_lembrete] ?? { icon: '💬', color: 'border-border bg-card text-foreground' };
                  const label    = TIPO_LABELS[r.tipo_lembrete] ?? r.tipo_lembrete;
                  const isSelected = selectedRegra === r.id;
                  const elegíveis  = elegibilidadePorRegra[r.id] ?? 0;

                  // Se há lead selecionado, opacidade reduzida nas não aplicáveis
                  const dimmed = !!leadAtual && !ativa;

                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRegra(r.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all
                        ${isSelected ? 'border-primary/50 bg-primary/10' : `${tipoInfo.color} hover:border-primary/30`}
                        ${dimmed ? 'opacity-40' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{tipoInfo.icon}</span>
                          <span className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>{label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {elegíveis > 0 && !leadAtual && (
                            <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                              {elegíveis} hoje
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {r.cadencia_envio}d
                          </Badge>
                        </div>
                      </div>
                      {r.template_mensagem && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {r.template_mensagem.replace(/\{nome\}/g, '...')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Busca de lead */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Selecionar Lead
              {regraAtual && (
                <span className="ml-2 text-green-400 normal-case">
                  — filtrando por "{TIPO_LABELS[regraAtual.tipo_lembrete]}"
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={regraAtual
                  ? 'Buscar lead elegível para esta regra hoje...'
                  : 'Buscar lead pelo nome ou telefone...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
                {filteredLeads.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {regraAtual
                      ? 'Nenhum lead elegível para esta regra hoje'
                      : 'Nenhum lead encontrado'}
                  </div>
                )}
                {filteredLeads.map(l => {
                  const cadencia = cadenciaMap.get(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => handleSelectLead(l.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${
                        selectedLead === l.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{l.nome}</p>
                        <div className="flex items-center gap-2">
                          {l.telefone && <p className="text-xs text-muted-foreground">{l.telefone}</p>}
                          {cadencia && (
                            <span className="text-[10px] text-green-400">{cadencia.label}</span>
                          )}
                        </div>
                      </div>
                      {selectedLead === l.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview */}
          {leadAtual && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="metric-card border-primary/20 bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{leadAtual.nome}</p>
                  <p className="text-xs text-muted-foreground">{leadAtual.telefone || 'Sem telefone'}</p>
                </div>
                {cadenciaDoLead && (
                  <Badge className="ml-auto text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                    {cadenciaDoLead.label}
                  </Badge>
                )}
              </div>

              {/* Mensagem: só aparece se regra selecionada for a correta para o lead */}
              {mensagem ? (
                <>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{mensagem}</p>
                  </div>
                  <a
                    href={leadAtual.telefone ? whatsappLink(leadAtual.telefone, mensagem) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      leadAtual.telefone
                        ? 'bg-green-500 hover:bg-green-400 text-white'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Abrir no WhatsApp
                  </a>
                  {!leadAtual.telefone && (
                    <p className="text-xs text-destructive text-center mt-1">Lead sem telefone</p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  {/* Mostra qual regra se aplica ao lead hoje */}
                  {cadenciaDoLead ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-400">
                        A regra de hoje para este lead é <strong>{cadenciaDoLead.label}</strong>.
                        Selecione essa regra acima para liberar o envio.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Nenhuma mensagem de cadência para enviar hoje para este lead.
                      </p>
                    </div>
                  )}
                  {/* Botão desativado */}
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Envio não disponível hoje
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Plano Pro */}
        <motion.div variants={item} className="space-y-4">
          <h3 className="font-display font-semibold text-foreground">Plano Pro — Automações</h3>
          <div className="metric-card border-dashed border-yellow-500/40 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold text-yellow-400 text-sm">Automatize seu WhatsApp</span>
            </div>
            <div className="space-y-2.5">
              {PLAN_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {f.pro ? (
                    <Lock className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${f.pro ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {f.text}
                  </span>
                  {f.pro && (
                    <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/40 ml-auto flex-shrink-0">
                      PRO
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-yellow-500/20">
              <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2">
                <Star className="h-4 w-4" />
                Ativar Plano Pro
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Conecte sua conta do WhatsApp Business
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="metric-card text-center">
              <p className="text-2xl font-display font-bold text-green-400">{leads.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total de leads</p>
            </div>
            <div className="metric-card text-center">
              <p className="text-2xl font-display font-bold text-primary">
                {leads.filter(l => l.telefone).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Com WhatsApp</p>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}