import { useState, useRef, useEffect } from 'react';
import { Bell, X, MessageCircle, CalendarDays, RotateCcw, Star, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificacoes, LEMBRETE_ICONS, LEMBRETE_LABELS } from '@/hooks/useNotificacoes';
import { Button } from '@/components/ui/button';

const TIPO_COLORS: Record<string, string> = {
  follow_up_pre_orcamento: 'text-blue-400 bg-blue-500/15',
  follow_up_pos_orcamento: 'text-purple-400 bg-purple-500/15',
  lembrete_agendamento:    'text-yellow-400 bg-yellow-500/15',
  pos_venda:               'text-green-400 bg-green-500/15',
};

const TIPO_ICONS_COMP: Record<string, React.ReactNode> = {
  follow_up_pre_orcamento: <MessageCircle className="h-4 w-4" />,
  follow_up_pos_orcamento: <RotateCcw className="h-4 w-4" />,
  lembrete_agendamento:    <CalendarDays className="h-4 w-4" />,
  pos_venda:               <Star className="h-4 w-4" />,
};

export function NotificacoesBell() {
  const [open, setOpen]   = useState(false);
  const [shown, setShown] = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const { data, isLoading, marcarDisparado } = useNotificacoes();

  const lembretes  = data?.lembretes ?? [];
  const total      = data?.totalAlertas ?? 0;  // apenas não lidos
  const hasUnread  = total > 0;

  // Fecha ao clicar fora — SEM marcar como lido
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Push notification quando há lembretes não lidos (1x por sessão)
  useEffect(() => {
    if (!hasUnread || shown) return;
    setShown(true);
    const msg = `Você tem ${total} lembrete${total > 1 ? 's' : ''} de cadência para hoje. Não deixe esperando!`;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Higi$Controle — Tem clientes esperando! 📬', {
        body: msg, icon: '/favicon.ico',
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('Higi$Controle — Tem clientes esperando! 📬', {
            body: msg, icon: '/favicon.ico',
          });
        }
      });
    }
  }, [hasUnread, total, shown]);

  // Marcar UM lembrete como lido
  const marcarUm = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    marcarDisparado.mutate([id]);
  };

  // Marcar TODOS como lidos
  const marcarTodos = () => {
    const ids = lembretes.filter(l => !l.disparado).map(l => l.id);
    if (ids.length > 0) marcarDisparado.mutate(ids);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {hasUnread && !isLoading && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold"
          >
            {total > 9 ? '9+' : total}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[60px] left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-display font-semibold text-sm text-foreground">
                  Notificações do dia
                </span>
                {hasUnread && (
                  <span className="text-[10px] bg-destructive/20 text-destructive rounded-full px-1.5 py-0.5 font-medium">
                    {total} não lidos
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[460px] overflow-y-auto">
              {isLoading && (
                <div className="py-8 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && lembretes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhum lembrete de cadência para hoje</p>
                </div>
              )}

              {lembretes.map(l => {
                const colorClass = TIPO_COLORS[l.tipo_lembrete] ?? 'text-muted-foreground bg-muted/20';
                const iconComp   = TIPO_ICONS_COMP[l.tipo_lembrete];
                const emoji      = LEMBRETE_ICONS[l.tipo_lembrete] ?? '📌';
                const label      = LEMBRETE_LABELS[l.tipo_lembrete] ?? l.tipo_lembrete;
                const lido       = l.disparado;

                return (
                  <div
                    key={l.id}
                    className={`px-4 py-3 border-b border-border/50 transition-colors ${
                      lido ? 'opacity-50' : 'hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        {iconComp}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">
                            {emoji} {label}
                          </span>
                          {/* Botão marcar como lido individual */}
                          {!lido && (
                            <button
                              onClick={e => marcarUm(l.id, e)}
                              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 flex-shrink-0"
                              title="Marcar como lido"
                            >
                              <CheckCheck className="h-3 w-3" />
                            </button>
                          )}
                          {lido && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">✓ lido</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{l.mensagem}</p>
                        {l.data_servico && (
                          <p className="text-[10px] text-yellow-400 mt-1">
                            📅 Serviço: {new Date(l.data_servico + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {!lido && (
                          <Link
                            to="/whatsapp"
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-primary hover:underline mt-1 inline-block"
                          >
                            Enviar mensagens →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-secondary/20 flex items-center justify-between">
              {hasUnread ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={marcarTodos}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todos como lidos
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Todos lidos</span>
              )}
              <Link
                to="/leads"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver leads →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}