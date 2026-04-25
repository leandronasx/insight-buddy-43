import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, User, Calendar, Pencil, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateEmpresaDialog } from '@/components/admin/CreateEmpresaDialog';
import { EditEmpresaDialog } from '@/components/admin/EditEmpresaDialog';
import { AdminSkeleton } from '@/components/LoadingSkeleton';

// Interface alinhada ao novo schema
interface Empresa {
  id: string;
  id_usuario: string;
  nome_empresa: string;
  nome_dono: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  endereco: string | null;
  cnpj_cpf: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  data_criacao: string;
}

function isAtivo(emp: Empresa): boolean {
  if (!emp.data_termino) return true;
  return new Date(emp.data_termino + 'T23:59:59') > new Date();
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function AdminEmpresas() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = async () => {
    setLoading(true);
    // Busca todas as empresas — admin vê todas via RLS (policy usa permissao = 'admin')
    // Exclui a empresa do próprio admin para não aparecer na lista de clientes
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .neq('id_usuario', user?.id ?? '')
      .order('data_criacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar empresas:', error.message);
      // Se RLS bloquear, tenta sem filtro (admin vê tudo)
      const { data: all } = await supabase
        .from('empresas')
        .select('*')
        .order('data_criacao', { ascending: false });
      setEmpresas((all as Empresa[]) ?? []);
    } else {
      setEmpresas((data as Empresa[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && user) fetchEmpresas();
    else if (!adminLoading) setLoading(false);
  }, [isAdmin, adminLoading, user?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return empresas;
    const q = search.toLowerCase();
    return empresas.filter(e =>
      e.nome_empresa.toLowerCase().includes(q) ||
      (e.nome_dono?.toLowerCase().includes(q) ?? false) ||
      (e.cnpj_cpf?.toLowerCase().includes(q) ?? false)
    );
  }, [empresas, search]);

  const openEdit = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setEditOpen(true);
  };

  if (adminLoading || loading) return <AdminSkeleton />;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="metric-card p-8 text-center max-w-md">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Gestão de Empresas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, dono ou CNPJ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="metric-card flex flex-col items-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground mb-1">
            {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
          </p>
          {!search && (
            <Button variant="outline" onClick={() => setCreateOpen(true)} className="mt-3 gap-1">
              <Plus className="h-4 w-4" /> Cadastrar primeira empresa
            </Button>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.map(emp => (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="metric-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
            onClick={() => openEdit(emp)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Logo ou ícone */}
                {emp.logo_url ? (
                  <img
                    src={emp.logo_url}
                    alt={emp.nome_empresa}
                    className="h-10 w-10 rounded-lg object-contain bg-secondary border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-foreground truncate">{emp.nome_empresa}</p>
                    <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  {emp.nome_dono && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{emp.nome_dono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(emp.data_inicio)}
                      {emp.data_termino
                        ? ` → ${formatDate(emp.data_termino)}`
                        : ' → Sem término'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status badge baseado em data_termino (novo schema não tem coluna status) */}
              <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                isAtivo(emp)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {isAtivo(emp) ? 'Ativo' : 'Expirado'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <CreateEmpresaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchEmpresas}
      />
      <EditEmpresaDialog
        empresa={editingEmpresa}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchEmpresas}
      />
    </div>
  );
}
