import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, User, Calendar, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { MonthSelector } from '@/components/MonthSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminOverview } from '@/components/AdminOverview';
import { CreateEmpresaDialog } from '@/components/admin/CreateEmpresaDialog';
import { EditEmpresaDialog } from '@/components/admin/EditEmpresaDialog';
import { FullPageSkeleton, AdminSkeleton } from '@/components/LoadingSkeleton';
import Login from './Login';

interface Empresa {
  id: string;
  user_id: string;
  empresa_nome: string;
  nome_dono: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export default function AdminEmpresas() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });
    setEmpresas((data as Empresa[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchEmpresas();
  }, [isAdmin]);

  const openEdit = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setEditOpen(true);
  };

  if (authLoading || adminLoading) return <FullPageSkeleton />;
  if (!user) return <Login />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="painel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="painel">Painel Geral</TabsTrigger>
          <TabsTrigger value="empresas">Gestão de Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value="painel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Painel Geral</h2>
            <MonthSelector />
          </div>
          <AdminOverview />
        </TabsContent>

        <TabsContent value="empresas">
          {loading ? (
            <AdminSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">Gestão de Empresas</h2>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Nova Empresa
                </Button>
              </div>

              <div className="space-y-3">
                {empresas.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">Nenhuma empresa cadastrada.</p>
                )}
                {empresas.map(emp => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="metric-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                    onClick={() => openEdit(emp)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <p className="font-display font-bold text-foreground truncate">{emp.empresa_nome}</p>
                          <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>
                        {emp.nome_dono && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{emp.nome_dono}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {emp.data_inicio ? new Date(emp.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                            {emp.data_termino ? ` → ${new Date(emp.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')}` : ' → Sem término'}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                          emp.status === 'ativo'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {emp.status === 'ativo' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        {emp.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <CreateEmpresaDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchEmpresas} />
              <EditEmpresaDialog empresa={editingEmpresa} open={editOpen} onOpenChange={setEditOpen} onSuccess={fetchEmpresas} />
            </div>
          )}
        </TabsContent>
      </Tabs>
  );
}
