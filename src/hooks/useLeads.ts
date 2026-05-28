import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';

// Valores conforme o novo schema (TEXT livre)
export const ORIGENS_LEAD = ['Tráfego', 'Orgânico', 'Indicação'] as const;
export const SITUACOES_CLIENTE = ['Agendado', 'Fechado', 'Reabordar', 'Sem Interesse', 'Interesse Futuro'] as const;
export const MOMENTOS_FUNIL = ['Pre Orçamento', 'Pos Orçamento', 'Pos Venda'] as const;
export const QUALIFICACOES = ['Sim', 'Não'] as const;

export interface Lead {
  id: string;
  id_empresa: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cnpj_cpf: string | null;
  endereco: string | null;
  origem_lead: string | null;
  situacao_do_cliente: string | null;
  momento_funil: string | null;
  qualificacao: string | null;
  robo_pos_vendas: boolean;
  robo_follow_ups: boolean;
  robo_atendimento: boolean;
  robo_agendamento: boolean;
  data_contato: string | null;
  data_orcamento: string | null;
  data_criacao: string;
  data_atualizacao: string;
}

export interface UseLeadsParams {
  page?: number;
  perPage?: number;
  search?: string;
  statusFilter?: string; // para o Kanban, por exemplo
}

export function useLeads(params: UseLeadsParams = {}) {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const { page = 1, perPage = 10, search = '', statusFilter = '' } = params;

  const queryKey = ['leads', empresa?.id, page, perPage, search, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return { leads: [], totalCount: 0 };

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('id_empresa', empresa.id);

      if (search.trim()) {
        const safeSearch = search.trim().replace(/"/g, '');
        const q = `"%${safeSearch}%"`;
        query = query.or(`nome.ilike.${q},telefone.ilike.${q},origem_lead.ilike.${q},situacao_do_cliente.ilike.${q}`);
      }

      if (statusFilter) {
        query = query.eq('situacao_do_cliente', statusFilter);
      }

      // Pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error, count } = await query
        .order('data_criacao', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        leads: (data ?? []) as Lead[],
        totalCount: count ?? 0,
      };
    },
    enabled: !!empresa,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const leads = data?.leads ?? [];
  const totalCount = data?.totalCount ?? 0;

  const saveLead = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Lead> & { nome: string; id_empresa: string }) => {
      if (id) {
        const { error } = await supabase.from('leads').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  return { leads, totalCount, isLoading, saveLead, deleteLead };
}