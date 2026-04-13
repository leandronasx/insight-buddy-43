import { useQuery } from '@tanstack/react-query';
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
}

export function useEmpresa() {
  const { user } = useAuth();

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

  return { empresa, loading };
}
