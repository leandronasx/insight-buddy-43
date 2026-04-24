import { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertCircle, CalendarDays, MessageCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificacoes } from '@/hooks/useNotificacoes';

function whatsappUrl(telefone: string | null, nome: string) {
  const num = (telefone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(`Olá ${nome}! 👋 Tudo bem? Passando para dar um oi e ver se posso te ajudar com algum serviço de higienização.`);
  return `https://wa.me/55${num}?text=${msg}`;
}

export function NotificacoesBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotificacoes();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const total = data?.totalAlertas ?? 0;
  const hasAlerts = total > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {hasAlerts && !isLoading && (
          <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">Notificações</span>
                {hasAlerts && (
                  <span className="text-[10px] bg-destructive/20 text-destructive rounded-full px-1.5 py-0.5 font-medium">
                    {total}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {/* Agendados hoje */}
              {(data?.agendadosHoje ?? 0) > 0 && (
                <div className="px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <Link to="/agenda" onClick={() => setOpen(false)} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CalendarDays className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {data!.agendadosHoje} serviço{data!.agendadosHoje > 1 ? 's' : ''} hoje
                      </p>
                      <p className="text-xs text-muted-foreground">Clique para ver a agenda</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Agendados amanhã */}
              {(data?.agendadosAmanha ?? 0) > 0 && (
                <div className="px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <Link to="/agenda" onClick={() => setOpen(false)} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {data!.agendadosAmanha} serviço{data!.agendadosAmanha > 1 ? 's' : ''} amanhã
                      </p>
                      <p className="text-xs text-muted-foreground">Envie lembretes com antecedência</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Leads 7+ dias sem contato */}
              {(data?.leadsSemContato7dias.length ?? 0) > 0 && (
                <div className="border-b border-border/50">
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                      Urgente — {data!.leadsSemContato7dias.length} lead{data!.leadsSemContato7dias.length > 1 ? 's' : ''} sem contato há 7+ dias
                    </span>
                  </div>
                  {data!.leadsSemContato7dias.slice(0, 4).map(lead => (
                    <div key={lead.id} className="px-4 py-2 hover:bg-secondary/30 transition-colors flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{lead.nome}</p>
                        <p className="text-[11px] text-destructive">{lead.diasSemContato} dias sem contato</p>
                      </div>
                      {lead.telefone && (
                        <a
                          href={whatsappUrl(lead.telefone, lead.nome)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 flex-shrink-0 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WA
                        </a>
                      )}
                    </div>
                  ))}
                  {data!.leadsSemContato7dias.length > 4 && (
                    <Link
                      to="/leads"
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-xs text-primary hover:underline"
                    >
                      Ver todos os {data!.leadsSemContato7dias.length} leads →
                    </Link>
                  )}
                </div>
              )}

              {/* Leads 3-7 dias sem contato */}
              {(data?.leadsSemContato3dias.length ?? 0) > 0 && (
                <div className="border-b border-border/50">
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                      {data!.leadsSemContato3dias.length} lead{data!.leadsSemContato3dias.length > 1 ? 's' : ''} sem contato há 3–7 dias
                    </span>
                  </div>
                  {data!.leadsSemContato3dias.slice(0, 3).map(lead => (
                    <div key={lead.id} className="px-4 py-2 hover:bg-secondary/30 transition-colors flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{lead.nome}</p>
                        <p className="text-[11px] text-warning">{lead.diasSemContato} dias sem contato</p>
                      </div>
                      {lead.telefone && (
                        <a
                          href={whatsappUrl(lead.telefone, lead.nome)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 flex-shrink-0 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WA
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !hasAlerts && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhum alerta pendente no momento</p>
                </div>
              )}

              {isLoading && (
                <div className="py-8 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-secondary/20">
              <Link
                to="/leads"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                Ver todos os leads →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
