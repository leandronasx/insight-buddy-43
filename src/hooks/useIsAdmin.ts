import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('usuarios')
        .select('permissao')
        .eq('id', user.id)
        .maybeSingle();
      return data?.permissao === 'admin';
    },
    enabled: !!user,
  });

  return { isAdmin, loading };
}
