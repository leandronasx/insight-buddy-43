import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';

export interface Venda {
  id: string;
  lead_id: string | null;
  valor_cheio: number;
  desconto: number;
  valor_final: number;
  data_venda: string;
  empresa_id: string;
}

export interface LeadOption {
  id: string;
  nome_lead: string;
}

function getDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endM = month === 12 ? 1 : month + 1;
  const endY = month === 12 ? year + 1 : year;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;
  return { start, end };
}

export function useVendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['vendas', empresa?.id, month, year];

  const { data: vendas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', start)
        .lt('data_venda', end)
        .order('data_venda', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Venda[];
    },
    enabled: !!empresa,
  });

  const { data: leadOptions = [] } = useQuery({
    queryKey: ['lead-options', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data } = await supabase
        .from('leads')
        .select('id, nome_lead')
        .eq('empresa_id', empresa.id)
        .order('nome_lead');
      return (data ?? []) as LeadOption[];
    },
    enabled: !!empresa,
  });

  const saveVenda = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Venda> & { empresa_id: string }) => {
      if (id) {
        const { error } = await supabase.from('vendas').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vendas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteVenda = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { vendas, leadOptions, isLoading, saveVenda, deleteVenda };
}
