import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import Leads from './Leads';
import Login from './Login';

export default function LeadsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground animate-pulse font-display">Carregando...</p></div>;
  if (!user) return <Login />;
  return (
    <AppLayout><Leads /></AppLayout>
  );
}
