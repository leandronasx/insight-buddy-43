import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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

function isHoje(dateStr: string): boolean {
  const hoje = new Date();
  const d    = new Date(dateStr + 'T00:00:00');
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth()    === hoje.getMonth() &&
    d.getDate()     === hoje.getDate()
  );
}

// Ícone por tipo
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

export function useNotificacoes() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const queryKey    = useMemo(() => ['notificacoes', empresa?.id], [empresa?.id]);

  // 1. Dispara a edge function ao abrir o sistema (1x por sessão / 10 min)
  useEffect(() => {
    if (!empresa) return;
    const lastRun = sessionStorage.getItem('lembretes_gerados_v5');
    const agora   = Date.now();
    if (lastRun && agora - Number(lastRun) < 10 * 60 * 1000) return; // 10 min cooldown

    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    supabase.rpc('gerar_lembretes_automacoes_v5', { 
      p_id_empresa: empresa.id,
      p_hoje: hojeStr
    }).then(() => {
      sessionStorage.setItem('lembretes_gerados_v5', String(agora));
      queryClient.invalidateQueries({ queryKey });
    }).catch(() => {/* silencioso se não deployada */});
  }, [empresa, queryClient, queryKey]);

  // 2. Lê lembretes de hoje não disparados
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
      // Badge só conta os não lidos, mas mostramos todos do dia
      const naoLidos = lembretes.filter(l => !l.disparado);

      return {
        lembretes,          // todos do dia (para leitura no painel)
        totalAlertas: naoLidos.length,  // badge só conta não lidos
      };
    },
    enabled: !!empresa,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // 3. Mutation para marcar como disparado
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

  return { ...query, marcarDisparado };
}