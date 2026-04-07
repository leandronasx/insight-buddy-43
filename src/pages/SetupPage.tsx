import { useAuth } from '@/hooks/useAuth';
import { MonthProvider } from '@/contexts/MonthContext';
import { AppLayout } from '@/components/AppLayout';
import SetupMensal from './SetupMensal';
import Login from './Login';

export default function SetupPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground animate-pulse font-display">Carregando...</p></div>;
  if (!user) return <Login />;
  return (
    <MonthProvider>
      <AppLayout><SetupMensal /></AppLayout>
    </MonthProvider>
  );
}
