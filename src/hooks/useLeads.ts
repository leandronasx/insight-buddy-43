import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';
import { Database } from '@/integrations/supabase/types';

export const ORIGENS = ['Tráfego', 'Orgânico', 'Indicação'] as const;
export const STATUS_LEAD = ['Agendado', 'Sem Interesse', 'Fechado', 'Reabordar'] as const;
export const MOMENTOS_FUNIL = ['Contato', 'Orçamento', 'Agendamento', 'Pós-venda'] as const;
export const QUALIFICACOES = ['Quente', 'Morno', 'Frio'] as const;

export type Lead = Database['public']['Tables']['leads']['Row'];
export type InsertLead = Database['public']['Tables']['leads']['Insert'];

export function useLeads() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['leads', empresa?.id, month, year];

  const { data: leads = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    enabled: !!empresa,
  });

  const saveLead = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Lead> & { nome_lead: string; empresa_id: string }) => {
      if (id) {
        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert(payload as InsertLead);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { leads, loading, saveLead, deleteLead };
}
