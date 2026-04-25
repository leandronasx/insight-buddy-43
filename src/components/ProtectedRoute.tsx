import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresa } from '@/hooks/useEmpresa';
import { AppLayout } from './AppLayout';
import { FullPageSkeleton } from './LoadingSkeleton';
import Login from '@/pages/Login';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { empresa, loading: empLoading } = useEmpresa();

  if (authLoading || (user && empLoading)) {
    return <FullPageSkeleton />;
  }

  if (!user) return <Login />;

  return <AppLayout>{children}</AppLayout>;
}
