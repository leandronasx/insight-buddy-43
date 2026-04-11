import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import type { Database } from '@/integrations/supabase/types';

type LeadOrigem = Database['public']['Enums']['lead_origem'];
type LeadStatus = Database['public']['Enums']['lead_status'];

export interface Lead {
  id: string;
  nome_lead: string;
  telefone: string | null;
  origem: LeadOrigem;
  status: LeadStatus;
  data_mensagem: string;
  empresa_id: string;
}

function getDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endM = month === 12 ? 1 : month + 1;
  const endY = month === 12 ? year + 1 : year;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;
  return { start, end };
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
        .eq('empresa_id', empresa.id)
        .gte('data_mensagem', start)
        .lt('data_mensagem', end)
        .order('data_mensagem', { ascending: false });
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
