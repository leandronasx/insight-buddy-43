import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';
import type { Database } from '@/integrations/supabase/types';

export type TipoServico = Database['public']['Enums']['tipo_servico'];

export interface Servico {
  id: string;
  empresa_id: string;
  venda_id: string | null;
  lead_id: string | null;
  tipo_servico: TipoServico;
  estofado: string | null;
  valor: number;
  created_at: string;
  updated_at: string;
}

export interface VendaOption {
  id: string;
  data_venda: string;
  valor_final: number;
  lead_id: string | null;
}

export function useServicos() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['servicos', empresa?.id, month, year];

  const { data: servicos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Servico[];
    },
    enabled: !!empresa,
  });

  const { data: vendaOptions = [] } = useQuery({
    queryKey: ['venda-options', empresa?.id, month, year],
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);
      const { data } = await supabase
        .from('vendas')
        .select('id, data_venda, valor_final, lead_id')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', start)
        .lt('data_venda', end)
        .order('data_venda', { ascending: false });
      return (data ?? []) as VendaOption[];
    },
    enabled: !!empresa,
  });

  const { data: leadOptions = [] } = useQuery({
    queryKey: ['lead-options-servicos', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data } = await supabase
        .from('leads')
        .select('id, nome_lead')
        .eq('empresa_id', empresa.id)
        .order('nome_lead');
      return (data ?? []) as { id: string; nome_lead: string }[];
    },
    enabled: !!empresa,
  });

  const saveServico = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Servico> & { empresa_id: string }) => {
      if (id) {
        const { error } = await supabase.from('servicos').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('servicos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { servicos, vendaOptions, leadOptions, isLoading, saveServico, deleteServico };
}
