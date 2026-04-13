import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresa } from '@/hooks/useEmpresa';
import { AppLayout } from './AppLayout';
import Login from '@/pages/Login';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { empresa, loading: empLoading } = useEmpresa();

  if (authLoading || (user && empLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse font-display text-lg">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  if (empresa?.status === 'inativo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Acesso Bloqueado</h2>
          <p className="text-muted-foreground">Sua empresa está inativa. Entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
