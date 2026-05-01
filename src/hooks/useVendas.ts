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

export interface UseVendasParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export function useVendas(params: UseVendasParams = {}) {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();
  const { page = 1, perPage = 10, search = '' } = params;

  const queryKey = ['vendas', empresa?.id, month, year, page, perPage, search];

  // Busca vendas via leads da empresa
  const { data: vendasData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return { vendas: [], totalCount: 0 };
      const { start, end } = getDateRange(month, year);

      // Restringe as vendas apenas aos leads da empresa usando inner join
      let query = supabase
        .from('vendas')
        .select('*, leads!inner(id_empresa)', { count: 'exact' })
        .eq('leads.id_empresa', empresa.id)
        .gte('data_venda', start)
        .lt('data_venda', end);

      if (search.trim()) {
        const safeSearch = search.trim().replace(/"/g, '');
        const q = `%${safeSearch}%`;

        // Verifica se a busca bate com algum nome de lead
        const { data: matchingLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('id_empresa', empresa.id)
          .ilike('nome', q)
          .limit(100);

        const leadsIds = (matchingLeads ?? []).map(l => l.id);

        if (leadsIds.length > 0) {
          // Se encontrou leads com esse nome, traz as vendas deles
          query = query.in('id_leads', leadsIds);
        } else {
          // Se não encontrou leads, assume que está buscando por status da venda
          query = query.ilike('status', q);
        }
      }

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await query
        .order('data_venda', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        vendas: (data ?? []) as Venda[],
        totalCount: count ?? 0
      };
    },
    enabled: !!empresa,
  });

  const vendas = vendasData?.vendas ?? [];
  const totalCount = vendasData?.totalCount ?? 0;

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
      (data ?? []).forEach((item: ItemVenda) => {
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
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['itens-vendas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { vendas: vendasComItens, totalCount, leadOptions, isLoading, saveVenda, deleteVenda };
}