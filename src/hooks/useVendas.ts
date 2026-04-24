import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';
import { Database } from '@/integrations/supabase/types';

export type Venda = Database['public']['Tables']['vendas']['Row'];

export interface VendaComItens extends Venda {
  valor_total: number;
  status: string;
  servicos: any[];
}

export interface LeadOption {
  id: string;
  nome_lead: string;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
}

export function useVendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['vendas', empresa?.id, month, year];

  const { data: vendas = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);

      const { data, error } = await supabase
        .from('vendas')
        .select('*, servicos(*)')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', start)
        .lt('data_venda', end)
        .order('data_venda', { ascending: false });

      if (error) throw error;

      // Calculate total values (for backwards compatibility in frontend, mapped from valor_final)
      const mapped = (data ?? []).map(v => ({
        ...v,
        status: 'Fechado', // Status in new schema comes from leads, hardcoding for type compatibility
        valor_total: Number(v.valor_final)
      }));

      return mapped as unknown as VendaComItens[];
    },
    enabled: !!empresa,
  });

  const { data: leadOptions = [] } = useQuery({
    queryKey: ['leadOptions', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data } = await supabase
        .from('leads')
        .select('id, nome_lead, telefone, email, cpf_cnpj, endereco')
        .eq('empresa_id', empresa.id)
        .order('nome_lead');
      return (data ?? []) as LeadOption[];
    },
    enabled: !!empresa,
  });

  const saveVenda = useMutation({
    mutationFn: async ({ id, servicos, ...payload }: Partial<Venda> & { lead_id: string; empresa_id: string; servicos?: any[] }) => {
  payload.valor_final = servicos ? servicos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0) : 0;

      if (id) {
        const { error } = await supabase.from('vendas').update(payload).eq('id', id);
        if (error) throw error;
        await supabase.from('servicos').delete().eq('venda_id', id);
        if (servicos && servicos.length > 0) {
          const rows = servicos.map(s => ({
            empresa_id: payload.empresa_id,
            lead_id: payload.lead_id,
            venda_id: id,
            estofado: s.estofado,
            valor: Number(s.valor || 0)
          }));
          await supabase.from('servicos').insert(rows);
        }
      } else {
        const { data, error } = await supabase.from('vendas').insert(payload).select().single();
        if (error) throw error;
        if (servicos && servicos.length > 0) {
          const rows = servicos.map(s => ({
            empresa_id: payload.empresa_id,
            lead_id: payload.lead_id,
            venda_id: data.id,
            estofado: s.estofado,
            valor: Number(s.valor || 0)
          }));
          await supabase.from('servicos').insert(rows);
        }
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

  return { vendas, loading, leadOptions, saveVenda, deleteVenda };
}
