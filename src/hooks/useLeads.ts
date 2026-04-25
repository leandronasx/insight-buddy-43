import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';

// Valores conforme o novo schema (TEXT livre)
export const ORIGENS_LEAD = ['Tráfego', 'Orgânico', 'Indicação', 'WhatsApp', 'Referência'] as const;
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

export function useLeads() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const queryClient = useQueryClient();

  const queryKey = ['leads', empresa?.id, month, year];

  const { data: leads = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { start, end } = getDateRange(month, year);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id_empresa', empresa.id)
        .gte('data_criacao', start)
        .lt('data_criacao', end)
        .order('data_criacao', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    enabled: !!empresa,
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { leads, isLoading, saveLead, deleteLead };
}