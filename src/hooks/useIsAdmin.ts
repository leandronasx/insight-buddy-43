import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Permissões do schema: 'admin' | 'manager' | 'viewer'
export type Permissao = 'admin' | 'manager' | 'viewer';

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: permissao = null, isLoading: loading } = useQuery({
    queryKey: ['permissao', user?.id],
    queryFn: async (): Promise<Permissao | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from('usuarios')
        .select('permissao')
        .eq('id', user.id)
        .maybeSingle();
      return (data?.permissao as Permissao) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAdmin:   permissao === 'admin',
    isManager: permissao === 'manager',
    isViewer:  permissao === 'viewer',
    permissao,
    loading,
  };
}
