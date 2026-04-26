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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Ícones e cores por tipo de regra
const TIPO_ICONS: Record<string, { icon: string; color: string }> = {
  follow_up_pre_orcamento:  { icon: '💬', color: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
  follow_up_pos_orcamento:  { icon: '🔁', color: 'border-purple-500/30 bg-purple-500/5 text-purple-400' },
  lembrete_agendamento:     { icon: '📅', color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400' },
  pos_venda:                { icon: '⭐', color: 'border-green-500/30 bg-green-500/5 text-green-400' },
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

function renderMensagem(template: string | null, nome: string): string {
  if (!template) return `Olá ${nome}! 👋`;
  return template.replace(/\{nome\}/g, nome).replace(/\{dias\}/g, '?');
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

  // Busca as regras criadas na página de Automações
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

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.nome.toLowerCase().includes(q) || l.telefone?.includes(q)
    ).slice(0, 8);
  }, [leads, search]);

  const lead = leads.find(l => l.id === selectedLead);
  const mensagem = regraAtual && lead ? renderMensagem(regraAtual.template_mensagem, lead.nome) : '';

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

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
              Selecione uma regra de cadência e um lead para enviar a mensagem com um clique.
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

          {/* Regras de cadência */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Regra de Cadência
            </label>

            {loadingRegras && (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-12 bg-card animate-pulse rounded-lg" />)}
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
                {regras.map(r => {
                  const tipoInfo = TIPO_ICONS[r.tipo_lembrete] ?? { icon: '💬', color: 'border-border bg-card text-foreground' };
                  const label = TIPO_LABELS[r.tipo_lembrete] ?? r.tipo_lembrete;
                  const isSelected = selectedRegra === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRegra(isSelected ? null : r.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : `${tipoInfo.color} hover:border-primary/30`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{tipoInfo.icon}</span>
                          <span className={`font-medium text-sm ${isSelected ? 'text-primary' : ''}`}>{label}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {r.cadencia_envio} dia{r.cadencia_envio !== 1 ? 's' : ''}
                        </Badge>
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
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead pelo nome ou telefone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
                {filteredLeads.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum lead encontrado</div>
                )}
                {filteredLeads.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedLead(l.id); setSearch(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${
                      selectedLead === l.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{l.nome}</p>
                      {l.telefone && <p className="text-xs text-muted-foreground">{l.telefone}</p>}
                    </div>
                    {selectedLead === l.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview e envio */}
          {lead && regraAtual && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="metric-card border-primary/20 bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{lead.nome}</p>
                  <p className="text-xs text-muted-foreground">{lead.telefone || 'Sem telefone'}</p>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{mensagem}</p>
              </div>
              <a
                href={lead.telefone ? whatsappLink(lead.telefone, mensagem) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  lead.telefone
                    ? 'bg-green-500 hover:bg-green-400 text-white'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
                Abrir no WhatsApp
              </a>
              {!lead.telefone && (
                <p className="text-xs text-destructive text-center mt-1">Lead sem telefone cadastrado</p>
              )}
            </motion.div>
          )}

          {lead && !regraAtual && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-xs text-warning">Selecione uma regra de cadência para ver a mensagem</p>
            </div>
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