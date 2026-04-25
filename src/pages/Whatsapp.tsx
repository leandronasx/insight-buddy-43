import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Zap, Lock, CheckCircle2, Phone,
  ArrowRight, Send, Star, User, Search
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const PLAN_FEATURES = [
  { text: 'Atendimento automático 24h no WhatsApp', pro: true },
  { text: 'Cadastro automático de novos clientes', pro: true },
  { text: 'Follow-up automático pós-mensagem', pro: true },
  { text: 'Lembrete de agendamento automático', pro: true },
  { text: 'Pós-venda automático', pro: true },
  { text: 'Confirmação e remarcação de serviços', pro: true },
  { text: 'Envio manual via link para o cliente', pro: false },
  { text: 'Follow-up manual com um clique', pro: false },
  { text: 'Lembrete de agendamento manual', pro: false },
];

const TEMPLATES = [
  {
    id: 'follow_up',
    label: 'Follow-up',
    icon: '🔁',
    msg: (nome: string) => `Olá ${nome}! 👋 Tudo bem? Passando para saber se você ainda tem interesse no nosso serviço de higienização. Ficou alguma dúvida? Estou à disposição!`,
  },
  {
    id: 'lembrete',
    label: 'Lembrete de Agendamento',
    icon: '📅',
    msg: (nome: string) => `Olá ${nome}! 😊 Lembramos que você tem um serviço agendado conosco. Confirme sua presença respondendo SIM ou NÃO. Qualquer dúvida, é só falar!`,
  },
  {
    id: 'pos_venda',
    label: 'Pós-venda',
    icon: '⭐',
    msg: (nome: string) => `Olá ${nome}! Esperamos que tenha gostado do nosso serviço! 🧹✨ Pode nos dar uma nota? E se precisar novamente, é só chamar. Obrigado pela confiança!`,
  },
  {
    id: 'orcamento',
    label: 'Enviar Orçamento',
    icon: '💰',
    msg: (nome: string) => `Olá ${nome}! Segue o orçamento do serviço de higienização conforme conversado. Qualquer dúvida estou à disposição. Quando podemos agendar? 😊`,
  },
];

function whatsappLink(telefone: string | null, mensagem: string) {
  const num = (telefone || '').replace(/\D/g, '');
  return `https://wa.me/55${num}?text=${encodeURIComponent(mensagem)}`;
}

export default function Whatsapp() {
  const { leads } = useLeads();
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;

  const filtered = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.nome.toLowerCase().includes(q) || l.telefone?.includes(q);
  }).slice(0, 10);

  const lead = leads.find(l => l.id === selectedLead);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">

      {/* Header banner */}
      <motion.div variants={item} className="metric-card border-green-500/30 bg-green-500/5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-foreground mb-1">Integração WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Envie mensagens manuais para seus leads com um clique. Para automações completas, ative o plano Pro.
            </p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs flex-shrink-0">
            Manual ativo
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Send manual message */}
        <motion.div variants={item} className="space-y-4">
          <h3 className="font-display font-semibold text-foreground">Envio Manual</h3>

          {/* Template selector */}
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all text-sm
                  ${selectedTemplate === t.id
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                  }`}
              >
                <span className="mr-1">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Lead search */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Selecionar Lead</label>
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
                {filtered.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum lead encontrado</div>
                )}
                {filtered.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setSelectedLead(l.id); setSearch(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors
                      ${selectedLead === l.id ? 'bg-primary/10' : ''}
                    `}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{l.nome}</p>
                      {l.telefone && <p className="text-xs text-muted-foreground">{l.telefone}</p>}
                    </div>
                    {selectedLead === l.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected lead preview */}
          {lead && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
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

              {/* Message preview */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {template.msg(lead.nome)}
                </p>
              </div>

              <a
                href={lead.telefone ? whatsappLink(lead.telefone, template.msg(lead.nome)) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${lead.telefone
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
        </motion.div>

        {/* Pro plan features */}
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

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-card text-center">
              <p className="text-2xl font-display font-bold text-green-400">{leads.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Leads com acesso</p>
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
