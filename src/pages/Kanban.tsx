import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Phone, MessageCircle, User, Search } from 'lucide-react';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/LoadingSkeleton';

const COLUMNS: { status: string; label: string; color: string; bg: string }[] = [
  { status: 'Novo',          label: 'Novo',          color: 'text-blue-400',         bg: 'bg-blue-500/10 border-blue-500/20' },
  { status: 'Em negociação', label: 'Em negociação', color: 'text-purple-400',       bg: 'bg-purple-500/10 border-purple-500/20' },
  { status: 'Agendado',      label: 'Agendado',      color: 'text-yellow-400',       bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { status: 'Fechado',       label: 'Fechado',       color: 'text-green-400',        bg: 'bg-green-500/10 border-green-500/20' },
  { status: 'Reabordar',     label: 'Reabordar',     color: 'text-orange-400',       bg: 'bg-orange-500/10 border-orange-500/20' },
  { status: 'Sem Interesse', label: 'Sem Interesse', color: 'text-muted-foreground', bg: 'bg-muted/30 border-border' },
];

const statusColors: Record<string, string> = {
  'Novo':          'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Em negociação': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Agendado':      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Fechado':       'bg-green-500/20 text-green-400 border-green-500/30',
  'Reabordar':     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Sem Interesse': 'bg-muted text-muted-foreground border-border',
};

function whatsappUrl(telefone: string | null, nome: string) {
  const num = (telefone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(`Olá ${nome}, tudo bem?`);
  return `https://wa.me/55${num}?text=${msg}`;
}

export default function Kanban() {
  const { leads, isLoading, saveLead } = useLeads();
  const { empresa } = useEmpresa();
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.nome.toLowerCase().includes(q) ||
      l.telefone?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Agrupa leads por situacao_do_cliente
  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    COLUMNS.forEach(c => { map[c.status] = []; });
    filtered.forEach(l => {
      const s = l.situacao_do_cliente || 'Novo';
      if (map[s] !== undefined) {
        map[s].push(l);
      } else {
        // Situação não mapeada vai para Novo
        map['Novo'].push(l);
      }
    });
    return map;
  }, [filtered]);

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleDrop = async (novoStatus: string) => {
    if (!dragging || !empresa) return;
    const lead = leads.find(l => l.id === dragging);
    if (!lead || lead.situacao_do_cliente === novoStatus) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    try {
      // Atualiza apenas situacao_do_cliente, preserva o resto
      await saveLead.mutateAsync({
        id: lead.id,
        nome: lead.nome,
        id_empresa: empresa.id,
        situacao_do_cliente: novoStatus,
        telefone: lead.telefone,
        email: lead.email,
        origem_lead: lead.origem_lead,
        momento_funil: lead.momento_funil,
        qualificacao: lead.qualificacao,
        robo_follow_ups: lead.robo_follow_ups,
        robo_atendimento: lead.robo_atendimento,
        robo_agendamento: lead.robo_agendamento,
        robo_pos_vendas: lead.robo_pos_vendas,
      });
      toast.success(`Lead movido para "${novoStatus}"`);
    } catch (e: any) {
      toast.error('Erro ao mover lead: ' + e.message);
    }
    setDragging(null);
    setDragOver(null);
  };

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} leads</span>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
        {COLUMNS.map(col => (
          <div
            key={col.status}  // ← fix: usa col.status (que existe), não col.situacao_do_cliente
            className={`flex-shrink-0 w-72 rounded-xl border ${col.bg} transition-all duration-200 ${
              dragOver === col.status ? 'ring-2 ring-primary/50 scale-[1.01]' : ''
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.status)}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
              <span className={`font-display font-semibold text-sm ${col.color}`}>{col.label}</span>
              <Badge variant="outline" className={`text-xs ${col.color} border-current`}>
                {byStatus[col.status]?.length ?? 0}
              </Badge>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[200px]">
              {byStatus[col.status]?.map(lead => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  draggable
                  onDragStart={() => handleDragStart(lead.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none ${
                    dragging === lead.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium text-sm text-foreground leading-tight">{lead.nome}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex-shrink-0 ${statusColors[lead.situacao_do_cliente || 'Novo'] ?? statusColors['Novo']}`}
                    >
                      {lead.situacao_do_cliente || 'Novo'}
                    </Badge>
                  </div>

                  {lead.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Phone className="h-3 w-3" />
                      <span>{lead.telefone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {/* fix: origem_lead, não lead.origem */}
                    <span className="text-[10px] text-muted-foreground">{lead.origem_lead || ''}</span>
                    {lead.telefone && (
                      <a
                        href={whatsappUrl(lead.telefone, lead.nome)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}

              {byStatus[col.status]?.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-xs italic">
                  Nenhum lead aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
