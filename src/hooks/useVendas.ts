import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';

export interface Venda {
  id: string;
  id_leads: string;
  data_venda: string;
  data_servico: string | null;
  horario_servico: string | null;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  data_criacao: string;
  data_atualizacao: string;
}

export interface ItemVenda {
  id: string;
  id_vendas: string;
  estofado: string;
  valor: number;
  bonus: number;
}

export interface VendaComItens extends Venda {
  itens: ItemVenda[];
  valor_total: number;   // soma bruta dos valores
  bonus_total: number;  // soma dos descontos/bônus
  valor_final: number;  // valor_total - bonus_total (valor cobrado)
}

export interface LeadOption {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cnpj_cpf: string | null;
  endereco: string | null;
}

export function useVendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['vendas', empresa?.id, month, year];

  // Busca vendas via leads da empresa
  const { data: vendas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);

      // Primeiro busca leads da empresa
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id')
        .eq('id_empresa', empresa.id);

      const leadIds = (leadsData ?? []).map(l => l.id);
      if (leadIds.length === 0) return [];

      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .in('id_leads', leadIds)
        .gte('data_venda', start)
        .lt('data_venda', end)
        .order('data_venda', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Venda[];
    },
    enabled: !!empresa,
  });

  // Busca itens das vendas
  const vendaIds = vendas.map(v => v.id);
  const vendaIdsKey = vendaIds.slice().sort().join(',');
  const { data: itensByVenda = {} } = useQuery({
    queryKey: ['itens-vendas', empresa?.id, vendaIdsKey],
    queryFn: async () => {
      if (!empresa || vendaIds.length === 0) return {};
      const { data, error } = await supabase
        .from('itens_vendas')
        .select('*')
        .in('id_vendas', vendaIds);
      if (error) throw error;
      const map: Record<string, ItemVenda[]> = {};
      (data ?? []).forEach((item: any) => {
        if (!map[item.id_vendas]) map[item.id_vendas] = [];
        map[item.id_vendas].push(item);
      });
      return map;
    },
    enabled: !!empresa && vendaIds.length > 0,
  });

  const vendasComItens: VendaComItens[] = vendas.map(v => {
    const itens = itensByVenda[v.id] || [];
    return {
      ...v,
      itens,
      valor_total: itens.reduce((s, i) => s + Number(i.valor), 0),
      bonus_total: itens.reduce((s, i) => s + Number(i.bonus ?? 0), 0),
      get valor_final() { return this.valor_total - this.bonus_total; },
    };
  });

  // Lead options para selects
  const { data: leadOptions = [] } = useQuery({
    queryKey: ['lead-options', empresa?.id],
    queryFn: async () => {
      if (!empresa) return [];
      const { data } = await supabase
        .from('leads')
        .select('id, nome, telefone, email, cnpj_cpf, endereco')
        .eq('id_empresa', empresa.id)
        .order('nome');
      return (data ?? []) as LeadOption[];
    },
    enabled: !!empresa,
  });

  const saveVenda = useMutation({
    mutationFn: async ({
      id,
      itens: itensPayload,
      ...payload
    }: Partial<Venda> & { itens?: { estofado: string; valor: number; bonus?: number }[] }) => {
      let vendaId = id;
      if (vendaId) {
        const { error } = await supabase.from('vendas').update(payload).eq('id', vendaId);
        if (error) throw error;
        await supabase.from('itens_vendas').delete().eq('id_vendas', vendaId);
      } else {
        const { data, error } = await supabase.from('vendas').insert(payload).select('id').single();
        if (error) throw error;
        vendaId = data.id;
      }
      if (itensPayload && itensPayload.length > 0 && vendaId) {
        const rows = itensPayload.map(item => ({
          id_vendas: vendaId!,
          estofado: item.estofado,
          valor: item.valor,
          bonus: item.bonus ?? 0,
        }));
        const { error: iErr } = await supabase.from('itens_vendas').insert(rows);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['itens-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteVenda = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('itens_vendas').delete().eq('id_vendas', id);
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['itens-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { vendas: vendasComItens, leadOptions, isLoading, saveVenda, deleteVenda };
}