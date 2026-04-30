import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type Role = 'admin' | 'manager' | 'viewer';

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: role = null, isLoading: loading } = useQuery({
    queryKey: ['role', user?.id],
    queryFn: async (): Promise<Role | null> => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('fn_get_user_role');
      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return (data as Role) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    isAdmin:   role === 'admin',
    isManager: role === 'manager',
    isViewer:  role === 'viewer',
    permissao: role,
    loading,
  };
}