import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';

export interface Venda {
  id: string;
  lead_id: string | null;
  valor_cheio: number;
  desconto: number;
  valor_final: number;
  data_venda: string;
  empresa_id: string;
  data_agendada: string | null;
  horario_agendado: string | null;
}

export interface VendaComServicos extends Venda {
  servicos: ServicoItem[];
}

export interface ServicoItem {
  id: string;
  estofado: string | null;
  valor: number;
  venda_id: string | null;
  empresa_id: string;
  lead_id: string | null;
  tipo_servico: string;
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

  // Fetch servicos for all vendas in the month
  const vendaIds = vendas.map(v => v.id);
  const { data: servicosByVenda = {} } = useQuery({
    queryKey: ['servicos-by-venda', empresa?.id, month, year, vendaIds],
    queryFn: async () => {
      if (!empresa || vendaIds.length === 0) return {};
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .in('venda_id', vendaIds);
      if (error) throw error;
      const map: Record<string, ServicoItem[]> = {};
      (data ?? []).forEach((s: any) => {
        if (s.venda_id) {
          if (!map[s.venda_id]) map[s.venda_id] = [];
          map[s.venda_id].push(s);
        }
      });
      return map;
    },
    enabled: !!empresa && vendaIds.length > 0,
  });

  const vendasComServicos: VendaComServicos[] = vendas.map(v => ({
    ...v,
    servicos: servicosByVenda[v.id] || [],
  }));

  const { data: leadOptions = [] } = useQuery({
    queryKey: ['lead-options', empresa?.id],
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
    mutationFn: async ({ id, servicos: items, ...payload }: Partial<Venda> & { empresa_id: string; servicos?: { estofado: string; valor: number }[] }) => {
      let vendaId = id;
      if (vendaId) {
        const { error } = await supabase.from('vendas').update(payload).eq('id', vendaId);
        if (error) throw error;
        // Delete existing servicos for this venda and re-insert
        await supabase.from('servicos').delete().eq('venda_id', vendaId);
      } else {
        const { data, error } = await supabase.from('vendas').insert(payload).select('id').single();
        if (error) throw error;
        vendaId = data.id;
      }
      // Insert servicos
      if (items && items.length > 0 && vendaId) {
        const rows = items.map(item => ({
          empresa_id: payload.empresa_id,
          venda_id: vendaId!,
          lead_id: payload.lead_id || null,
          tipo_servico: 'higienização' as const,
          estofado: item.estofado || null,
          valor: item.valor,
        }));
        const { error: sErr } = await supabase.from('servicos').insert(rows);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['servicos-by-venda'] });
    },
  });

  const deleteVenda = useMutation({
    mutationFn: async (id: string) => {
      // servicos with cascade or manual delete
      await supabase.from('servicos').delete().eq('venda_id', id);
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['servicos-by-venda'] });
    },
  });

  return { vendas: vendasComServicos, leadOptions, isLoading, saveVenda, deleteVenda };
}
