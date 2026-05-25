import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';

export interface LembreteNotificacao {
  id: string;
  tipo_lembrete: string;
  data_execucao: string;
  mensagem: string;
  data_servico: string | null;
  disparado: boolean;
}

export interface NotificacoesData {
  lembretes: LembreteNotificacao[];
  totalAlertas: number;
}

export const LEMBRETE_ICONS: Record<string, string> = {
  follow_up_pre_orcamento: '💬',
  follow_up_pos_orcamento: '🔁',
  lembrete_agendamento:    '📅',
  pos_venda:               '⭐',
};

export const LEMBRETE_LABELS: Record<string, string> = {
  follow_up_pre_orcamento: 'Follow-up Pré-orçamento',
  follow_up_pos_orcamento: 'Follow-up Pós-orçamento',
  lembrete_agendamento:    'Lembrete de Agendamento',
  pos_venda:               'Pós-venda',
};

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Gera uma chave estável baseada no endpoint do dispositivo
// Assim celular e notebook têm chaves diferentes, mas o mesmo
// dispositivo nunca re-registra mesmo que a empresa mude
function deviceKey(endpoint: string): string {
  return `push_endpoint_${btoa(endpoint).slice(-24)}`;
}

export function useNotificacoes() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const queryKey    = useMemo(() => ['notificacoes', empresa?.id], [empresa?.id]);
  const pushRegistradoRef = useRef(false);

  // ── Registrar subscription de push ──
  const subscribeToPushNotifications = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!VAPID_PUBLIC_KEY) return;

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const subJSON = subscription.toJSON();
      if (!subJSON.endpoint || !subJSON.keys) return;

      // Se este endpoint já foi salvo neste dispositivo, não faz nada
      const key = deviceKey(subJSON.endpoint);
      if (localStorage.getItem(key)) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        }, { onConflict: 'user_id,endpoint' }); // par correto: permite multi-device

      if (error) {
        console.error('[Push] Erro ao salvar subscription:', error);
        return;
      }

      // Marca como registrado só após salvar com sucesso
      localStorage.setItem(key, '1');

    } catch (error) {
      console.error('[Push] Erro:', error);
    }
  }, []);

  // ── Boot: registrar subscription 1x por dispositivo ──
  // O DISPARO do push é feito exclusivamente pelo cron job (send-web-push com cron:true)
  // O frontend só registra a subscription e mostra notificação local quando o sistema está aberto
  useEffect(() => {
    if (!empresa) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (pushRegistradoRef.current) return;

    pushRegistradoRef.current = true;
    subscribeToPushNotifications();
  }, [empresa, subscribeToPushNotifications]);

  // ── 1. Gerar lembretes (1x por sessão / 10 min) ──
  useEffect(() => {
    if (!empresa) return;
    const lastRun = sessionStorage.getItem('lembretes_gerados_v5');
    const agora   = Date.now();
    if (lastRun && agora - Number(lastRun) < 10 * 60 * 1000) return;

    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    supabase.rpc('gerar_lembretes_automacoes_v5', {
      p_id_empresa: empresa.id,
      p_hoje: hojeStr
    }).then(async () => {
      sessionStorage.setItem('lembretes_gerados_v5', String(agora));
      await queryClient.invalidateQueries({ queryKey });
    }).catch(() => {});
  }, [empresa, queryClient, queryKey]);

  // ── 2. Ler lembretes de hoje ──
  const query = useQuery<NotificacoesData>({
    queryKey,
    queryFn: async (): Promise<NotificacoesData> => {
      if (!empresa) return { lembretes: [], totalAlertas: 0 };

      const d = new Date();
      const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('lembretes_automacoes')
        .select('id, tipo_lembrete, data_execucao, mensagem, data_servico, disparado')
        .eq('id_empresa', empresa.id)
        .eq('data_execucao', hoje)
        .order('tipo_lembrete');

      const lembretes = (data ?? []) as LembreteNotificacao[];
      const naoLidos  = lembretes.filter(l => !l.disparado);

      return { lembretes, totalAlertas: naoLidos.length };
    },
    enabled: !!empresa,
    refetchInterval: 5 * 60 * 1000,
    staleTime:       2 * 60 * 1000,
  });

  // ── 3. Marcar como disparado ──
  const marcarDisparado = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      await supabase
        .from('lembretes_automacoes')
        .update({ disparado: true })
        .in('id', ids);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { ...query, marcarDisparado, subscribeToPushNotifications };
}