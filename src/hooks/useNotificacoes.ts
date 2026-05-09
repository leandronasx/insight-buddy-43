import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useCallback } from 'react';
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

export function useNotificacoes() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const queryKey    = useMemo(() => ['notificacoes', empresa?.id], [empresa?.id]);

  const subscribeToPushNotifications = useCallback(async () => {
    try {
      console.log('[Push] Iniciando subscribe...');
      console.log('[Push] VAPID_PUBLIC_KEY length:', VAPID_PUBLIC_KEY.length);
      console.log('[Push] VAPID_PUBLIC_KEY preview:', VAPID_PUBLIC_KEY.substring(0, 10));

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Não suportado pelo browser.');
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        console.error('[Push] VITE_VAPID_PUBLIC_KEY não definida!');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] SW ready, scope:', registration.scope);

      let subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Subscription existente:', !!subscription);

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log('[Push] Nova subscription criada:', subscription.endpoint.substring(0, 60));
      }

      const subJSON = subscription.toJSON();
      if (!subJSON.endpoint || !subJSON.keys) {
        console.error('[Push] subJSON inválido:', subJSON);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('[Push] User ID:', user?.id);
      if (!user) {
        console.error('[Push] Usuário não autenticado!');
        return;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('[Push] ERRO ao salvar subscription:', JSON.stringify(error));
      } else {
        console.log('[Push] ✅ Subscription salva no Supabase para user:', user.id);
      }
    } catch (error) {
      console.error('[Push] Erro geral:', error);
    }
  }, []);

  // ── Boot: registrar push assim que empresa carregar e permissão já estiver granted ──
  useEffect(() => {
    if (!empresa) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const key = `push_registered_${empresa.id}`;
    if (sessionStorage.getItem(key)) return;

    console.log('[Push] Boot: permissão granted, registrando subscription...');
    subscribeToPushNotifications().then(() => {
      sessionStorage.setItem(key, '1');
    });
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

  // ── 1.5. Disparar web push diário ──
  useEffect(() => {
    if (!empresa) return;

    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const pushSentToday = localStorage.getItem(`push_sent_${hojeStr}`);
    if (pushSentToday) return;

    setTimeout(async () => {
      try {
        const { data: lembretesData } = await supabase
          .from('lembretes_automacoes')
          .select('id')
          .eq('id_empresa', empresa.id)
          .eq('data_execucao', hojeStr)
          .eq('disparado', false);

        if (lembretesData && lembretesData.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.functions.invoke('send-web-push', {
              body: {
                user_id: user.id,
                title: 'Higi$Controle - Clientes Esperando! 📬',
                body: `Você tem ${lembretesData.length} lembrete(s) de cadência para hoje. Abra o sistema!`,
                data: { url: '/whatsapp' }
              }
            });
            localStorage.setItem(`push_sent_${hojeStr}`, 'true');
          }
        }
      } catch (e) {
        console.error('[Push] Erro ao disparar push diário:', e);
      }
    }, 3000);
  }, [empresa]);

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