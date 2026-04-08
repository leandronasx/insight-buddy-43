import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, User, Calendar, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppLayout } from '@/components/AppLayout';
import { MonthProvider } from '@/contexts/MonthContext';
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

const emptyForm = {
  empresa_nome: '',
  nome_dono: '',
  email: '',
  password: '',
  data_inicio: new Date().toISOString().split('T')[0],
  data_termino: '',
};

export default function AdminEmpresas() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({
    empresa_nome: '',
    nome_dono: '',
    data_inicio: '',
    data_termino: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });

  const fetchEmpresas = async () => {
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });
    setEmpresas((data as Empresa[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) fetchEmpresas();
  }, [isAdmin]);

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    const res = await supabase.functions.invoke('create-empresa', {
      body: {
        email: form.email,
        password: form.password,
        empresa_nome: form.empresa_nome,
        nome_dono: form.nome_dono,
        data_inicio: form.data_inicio,
        data_termino: form.data_termino || null,
      },
    });
    if (res.error || res.data?.error) {
      setError(res.error?.message || res.data?.error || 'Erro ao criar empresa');
      setSaving(false);
      return;
    }
    setCreateOpen(false);
    setForm({ ...emptyForm });
    setSaving(false);
    fetchEmpresas();
  };

  const openEdit = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setEditForm({
      empresa_nome: emp.empresa_nome,
      nome_dono: emp.nome_dono || '',
      data_inicio: emp.data_inicio || '',
      data_termino: emp.data_termino || '',
      status: emp.status,
    });
    setError('');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingEmpresa) return;
    setError('');
    setSaving(true);

    // Update empresa fields
    const { error: updateErr } = await supabase
      .from('empresas')
      .update({
        empresa_nome: editForm.empresa_nome,
        nome_dono: editForm.nome_dono || null,
        data_inicio: editForm.data_inicio || null,
        data_termino: editForm.data_termino || null,
        status: editForm.status,
      })
      .eq('id', editingEmpresa.id);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditOpen(false);
    setEditingEmpresa(null);
    fetchEmpresas();
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse font-display text-lg">Carregando...</p>
      </div>
    );
  }

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
    <MonthProvider>
      <AppLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-foreground">Gestão de Empresas</h2>
            <Button onClick={() => { setError(''); setCreateOpen(true); }} size="sm">
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

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Nova Empresa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome da Empresa *</label>
                  <Input value={form.empresa_nome} onChange={e => setForm({ ...form, empresa_nome: e.target.value })} className="bg-secondary border-border" placeholder="Ex: Estofados Premium" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome do Dono</label>
                  <Input value={form.nome_dono} onChange={e => setForm({ ...form, nome_dono: e.target.value })} className="bg-secondary border-border" placeholder="João Silva" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">E-mail de Login *</label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border" placeholder="cliente@email.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Senha *</label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="bg-secondary border-border" placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Data de Início</label>
                    <Input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Data de Término</label>
                    <Input type="date" value={form.data_termino} onChange={e => setForm({ ...form, data_termino: e.target.value })} className="bg-secondary border-border" />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleCreate} className="w-full" disabled={saving || !form.empresa_nome || !form.email || !form.password}>
                  {saving ? 'Criando...' : 'Criar Empresa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Editar Empresa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome da Empresa *</label>
                  <Input value={editForm.empresa_nome} onChange={e => setEditForm({ ...editForm, empresa_nome: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome do Dono</label>
                  <Input value={editForm.nome_dono} onChange={e => setEditForm({ ...editForm, nome_dono: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Data de Início</label>
                    <Input type="date" value={editForm.data_inicio} onChange={e => setEditForm({ ...editForm, data_inicio: e.target.value })} className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Data de Término</label>
                    <Input type="date" value={editForm.data_termino} onChange={e => setEditForm({ ...editForm, data_termino: e.target.value })} className="bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={editForm.status === 'ativo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, status: 'ativo' })}
                    >
                      <ToggleRight className="h-4 w-4 mr-1" /> Ativo
                    </Button>
                    <Button
                      type="button"
                      variant={editForm.status === 'inativo' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, status: 'inativo' })}
                    >
                      <ToggleLeft className="h-4 w-4 mr-1" /> Inativo
                    </Button>
                  </div>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleEdit} className="w-full" disabled={saving || !editForm.empresa_nome}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </MonthProvider>
  );
}
