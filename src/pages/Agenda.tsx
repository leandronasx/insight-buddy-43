import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, User, Phone, MessageCircle, CalendarDays } from 'lucide-react';
import { useVendas, type VendaComItens } from '@/hooks/useVendas';
import { formatCurrency } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/LoadingSkeleton';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

function whatsappUrl(telefone: string | null, nome: string, dataServico: string | null) {
  const num = (telefone || '').replace(/\D/g, '');
  const data = dataServico ? new Date(dataServico + 'T00:00:00').toLocaleDateString('pt-BR') : '';
  const msg = encodeURIComponent(`Olá ${nome}! Lembramos que seu serviço está agendado para ${data}. Confirme sua presença!`);
  return `https://wa.me/55${num}?text=${msg}`;
}

export default function Agenda() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const { vendas: vendasComItens, leadOptions, isLoading } = useVendas();

  const vendas = vendasComItens.filter(v => v.data_servico);

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map day -> vendas
  const vendaByDay = useMemo(() => {
    const map: Record<number, typeof vendas> = {};
    vendas.forEach(v => {
      if (!v.data_servico) return;
      const d = new Date(v.data_servico + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(v);
      }
    });
    return map;
  }, [vendas, month, year]);

  const selectedVendas = selectedDay ? (vendaByDay[selectedDay] || []) : [];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getLeadInfo = (leadId: string | null) => leadOptions.find(l => l.id === leadId);

  if (isLoading) return <ListSkeleton />;

  // Stats for the month
  const totalMes = Object.values(vendaByDay).flat().length;
  const totalValorMes = Object.values(vendaByDay).flat().reduce((s, v) => s + v.valor_total, 0);

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-info" />
            <span className="text-xs text-muted-foreground">Agendados no Mês</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totalMes}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Faturamento Previsto</span>
          </div>
          <p className="font-display text-2xl font-bold text-positive">{formatCurrency(totalValorMes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 metric-card p-0 overflow-hidden">
          {/* Header nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <span className="font-display font-semibold text-foreground">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center py-2 text-xs text-muted-foreground font-medium">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 border-b border-r border-border/40 last:border-r-0" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = day === selectedDay;
              const hasEvents = !!vendaByDay[day]?.length;
              const count = vendaByDay[day]?.length ?? 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-14 flex flex-col items-center justify-start pt-1.5 gap-0.5 border-b border-r border-border/40 last:border-r-0 transition-colors hover:bg-secondary/50
                    ${isSelected ? 'bg-primary/10' : ''}
                  `}
                >
                  <span className={`text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full transition-colors
                    ${isToday ? 'bg-primary text-primary-foreground' : isSelected ? 'text-primary' : 'text-foreground'}
                  `}>
                    {day}
                  </span>
                  {hasEvents && (
                    <span className="text-[10px] bg-primary/20 text-primary rounded px-1 leading-tight">
                      {count}x
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-display font-semibold text-foreground">
            {selectedDay
              ? `${selectedDay} de ${MONTHS[month]}`
              : 'Selecione um dia'}
          </h3>

          {selectedVendas.length === 0 ? (
            <div className="metric-card flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum serviço agendado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedVendas.map(v => {
                const lead = getLeadInfo(v.lead_id);
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="metric-card"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{lead?.nome ?? '—'}</p>
                          {v.horario_servico && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {v.horario_servico.slice(0, 5)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-positive border-positive/30 bg-positive/10">
                        {formatCurrency(v.valor_total)}
                      </Badge>
                    </div>

                    {v.itens.length > 0 && (
                      <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
                        {v.itens.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>{s.estofado || 'Item'}</span>
                            <span>{formatCurrency(s.valor)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {lead?.telefone && (
                        <>
                          <a
                            href={`tel:${lead.telefone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Phone className="h-3 w-3" /> Ligar
                          </a>
                          <span className="text-border">·</span>
                          <a
                            href={whatsappUrl(lead.telefone, lead.nome, v.data_servico)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                          >
                            <MessageCircle className="h-3 w-3" /> Lembrete
                          </a>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
