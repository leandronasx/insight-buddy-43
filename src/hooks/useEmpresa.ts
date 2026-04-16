import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Empresa {
  id: string;
  user_id: string;
  empresa_nome: string;
  nome_dono: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  status: 'ativo' | 'inativo';
  endereco: string | null;
  cnpj_cpf: string | null;
  email: string | null;
  telefone: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
}

export function useEmpresa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: empresa = null, isLoading: loading } = useQuery({
    queryKey: ['empresa', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as Empresa;
    },
    enabled: !!user,
  });

  const updateEmpresa = useMutation({
    mutationFn: async (updates: Partial<Empresa>) => {
      if (!empresa) throw new Error('Empresa não encontrada');
      const { error } = await supabase
        .from('empresas')
        .update(updates)
        .eq('id', empresa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa', user?.id] });
    },
  });

  return { empresa, loading, updateEmpresa };
}
