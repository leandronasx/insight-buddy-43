import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, Building2, User,
  Calendar, Phone, Mail, Lock, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  X, Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminSkeleton } from '@/components/LoadingSkeleton';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmpresaRow {
  id: string;
  id_usuario: string;
  nome_empresa: string;
  nome_dono: string | null;
  telefone: string | null;
  cnpj_cpf: string | null;
  endereco: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  data_criacao: string;
  data_atualizacao: string;
}

interface UsuarioRow {
  id: string;
  email: string;
  status: string;
  permissao: string;
}

interface EmpresaComUsuario extends EmpresaRow {
  usuario: UsuarioRow | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasParaVencer(dataTermino: string | null): number | null {
  if (!dataTermino) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const termino = new Date(dataTermino + 'T00:00:00');
  return Math.round((termino.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

function gerarSenha(length = 12): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$!';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

type StatusVencimento = 'ativo' | 'expirando' | 'expirado' | 'sem_termino';

function getStatusVencimento(
  usuarioStatus: string | undefined,
  dataTermino: string | null,
): StatusVencimento {
  if (usuarioStatus === 'inativo') return 'expirado';
  const dias = diasParaVencer(dataTermino);
  if (dias === null) return 'sem_termino';
  if (dias < 0) return 'expirado';
  if (dias <= 7) return 'expirando';
  return 'ativo';
}

const STATUS_CONFIG: Record<StatusVencimento, {
  label: string;
  badge: string;
  dot: string;
}> = {
  ativo:       { label: 'Ativo',       badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400'      },
  expirando:   { label: 'Expirando',   badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',       dot: 'bg-amber-400'        },
  expirado:    { label: 'Inativo',     badge: 'bg-red-500/15 text-red-400 border-red-500/30',             dot: 'bg-red-400'          },
  sem_termino: { label: 'Sem término', badge: 'bg-muted text-muted-foreground border-border',             dot: 'bg-muted-foreground' },
};

// ─── Formulários padrão ───────────────────────────────────────────────────────

const EMPTY_CREATE = {
  nome_empresa: '',
  nome_dono: '',
  telefone: '',
  email: '',
  password: '',
  data_inicio: new Date().toISOString().split('T')[0],
  data_termino: '',
};

const EMPTY_EDIT = {
  nome_empresa:   '',
  nome_dono:      '',
  telefone:       '',
  data_inicio:    '',
  data_termino:   '',
  usuario_status: 'ativo' as 'ativo' | 'inativo',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdminEmpresas() {
  const { user } = useAuth();

  const [empresas, setEmpresas]           = useState<EmpresaComUsuario[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [filtroStatus, setFiltroStatus]   = useState<StatusVencimento | 'todos'>('todos');

  const [createOpen, setCreateOpen]       = useState(false);
  const [editTarget, setEditTarget]       = useState<EmpresaComUsuario | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<EmpresaComUsuario | null>(null);

  const [createForm, setCreateForm]       = useState(EMPTY_CREATE);
  const [editForm, setEditForm]           = useState(EMPTY_EDIT);
  const [showPassword, setShowPassword]   = useState(false);
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  // .neq('id_usuario', user.id) → exclui a empresa do próprio admin logado

  const fetchEmpresas = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: empData, error } = await supabase
        .from('empresas')
        .select('*')
        .neq('id_usuario', user.id)
        .order('data_criacao', { ascending: false });

      if (error) throw error;

      if (!empData?.length) {
        setEmpresas([]);
        return;
      }

      const usuarioIds = empData.map(e => e.id_usuario);
      const { data: usrData } = await supabase
        .from('usuarios')
        .select('id, email, status, permissao')
        .in('id', usuarioIds);

      const usrMap = new Map((usrData ?? []).map(u => [u.id, u]));

      setEmpresas(empData.map(e => ({ ...e, usuario: usrMap.get(e.id_usuario) ?? null })));
    } catch (err) {
      toast.error('Erro ao carregar empresas: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  // ─── Filtros ──────────────────────────────────────────────────────────────

  const empresasFiltradas = empresas.filter(e => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.nome_empresa.toLowerCase().includes(q) ||
      (e.nome_dono ?? '').toLowerCase().includes(q) ||
      (e.usuario?.email ?? '').toLowerCase().includes(q) ||
      (e.telefone ?? '').includes(q);

    const sv = getStatusVencimento(e.usuario?.status, e.data_termino);
    const matchStatus = filtroStatus === 'todos' || sv === filtroStatus;

    return matchSearch && matchStatus;
  });

  const stats = {
    total:     empresas.length,
    ativas:    empresas.filter(e => getStatusVencimento(e.usuario?.status, e.data_termino) === 'ativo').length,
    expirando: empresas.filter(e => getStatusVencimento(e.usuario?.status, e.data_termino) === 'expirando').length,
    inativas:  empresas.filter(e => getStatusVencimento(e.usuario?.status, e.data_termino) === 'expirado').length,
  };

  // ─── Criar ────────────────────────────────────────────────────────────────
  // Fluxo completo via edge function create-empresa:
  //   auth.users → (trigger) → public.usuarios → public.empresas → (trigger) → regras_automacoes

  const handleCreate = async () => {
    if (!createForm.nome_empresa || !createForm.email || !createForm.password) {
      toast.error('Nome, e-mail e senha são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-empresa', {
        body: {
          email:        createForm.email,
          password:     createForm.password,
          nome_empresa: createForm.nome_empresa,
          nome_dono:    createForm.nome_dono   || null,
          telefone:     createForm.telefone    || null,
          data_inicio:  createForm.data_inicio || null,
          data_termino: createForm.data_termino || null,
        },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      toast.success(`Empresa "${createForm.nome_empresa}" criada!`);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchEmpresas(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── Editar ───────────────────────────────────────────────────────────────
  // Edita apenas public.empresas + public.usuarios.status via edge function

  const openEdit = (e: EmpresaComUsuario) => {
    setEditTarget(e);
    setEditForm({
      nome_empresa:   e.nome_empresa,
      nome_dono:      e.nome_dono    ?? '',
      telefone:       e.telefone     ?? '',
      data_inicio:    e.data_inicio  ?? '',
      data_termino:   e.data_termino ?? '',
      usuario_status: e.usuario?.status === 'inativo' ? 'inativo' : 'ativo',
    });
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.nome_empresa.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-empresa-status', {
        body: {
          empresa_id:     editTarget.id,
          nome_empresa:   editForm.nome_empresa,
          nome_dono:      editForm.nome_dono    || null,
          telefone:       editForm.telefone     || null,
          data_inicio:    editForm.data_inicio  || null,
          data_termino:   editForm.data_termino || null,
          usuario_status: editForm.usuario_status,
        },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      toast.success('Empresa atualizada!');
      setEditTarget(null);
      fetchEmpresas(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // ─── Excluir ──────────────────────────────────────────────────────────────
  // Edge function delete-empresa:
  //   public.empresas (CASCADE) → auth.users

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-empresa', {
        body: { empresa_id: deleteTarget.id },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      toast.success(`Empresa "${deleteTarget.nome_empresa}" excluída!`);
      setDeleteTarget(null);
      fetchEmpresas(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AdminSkeleton />;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Gestão de Empresas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie, edite e gerencie todas as empresas clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="icon"
            onClick={() => fetchEmpresas(true)}
            disabled={refreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Empresa
          </Button>
        </div>
      </div>

      {/* Stats como filtros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Total',     value: stats.total,     color: 'text-foreground',  filter: 'todos'     },
          { label: 'Ativas',    value: stats.ativas,    color: 'text-emerald-400', filter: 'ativo'     },
          { label: 'Expirando', value: stats.expirando, color: 'text-amber-400',   filter: 'expirando' },
          { label: 'Inativas',  value: stats.inativas,  color: 'text-red-400',     filter: 'expirado'  },
        ] as const).map(s => (
          <button
            key={s.label}
            onClick={() => setFiltroStatus(prev => prev === s.filter ? 'todos' : s.filter)}
            className={`metric-card text-left transition-all ${filtroStatus === s.filter ? 'ring-2 ring-primary/50' : ''}`}
          >
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, dono, e-mail ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {empresasFiltradas.length} empresa{empresasFiltradas.length !== 1 ? 's' : ''} encontrada{empresasFiltradas.length !== 1 ? 's' : ''}
        {filtroStatus !== 'todos' && ` · filtrando por "${STATUS_CONFIG[filtroStatus as StatusVencimento].label}"`}
      </p>

      {/* Lista */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {empresasFiltradas.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="metric-card flex flex-col items-center justify-center py-16 text-center"
            >
              <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-foreground">Nenhuma empresa encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Tente ajustar a busca' : 'Crie a primeira empresa clicando em "Nova Empresa"'}
              </p>
            </motion.div>
          ) : (
            empresasFiltradas.map((empresa, idx) => {
              const sv   = getStatusVencimento(empresa.usuario?.status, empresa.data_termino);
              const cfg  = STATUS_CONFIG[sv];
              const dias = diasParaVencer(empresa.data_termino);

              return (
                <motion.div
                  key={empresa.id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: idx * 0.03 }}
                  className="metric-card"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: empresa.cor_primaria ?? '#22c55e' }}
                    >
                      {empresa.nome_empresa.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-foreground">{empresa.nome_empresa}</p>
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </Badge>
                        {sv === 'expirando' && dias !== null && (
                          <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 bg-amber-500/10">
                            {dias}d restante{dias !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {sv === 'expirado' && empresa.data_termino && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/10">
                            Venceu {formatDate(empresa.data_termino)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {empresa.nome_dono && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{empresa.nome_dono}</span>
                        )}
                        {empresa.usuario?.email && (
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{empresa.usuario.email}</span>
                        )}
                        {empresa.telefone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{empresa.telefone}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(empresa.data_inicio)}
                          {empresa.data_termino ? ` → ${formatDate(empresa.data_termino)}` : ' · Sem término'}
                        </span>
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(empresa)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(empresa)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <button onClick={() => setCreateOpen(true)} className="fab-button">
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── Modal Criar ──────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); setCreateForm(EMPTY_CREATE); setShowPassword(false); } }}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Nova Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Nome da Empresa *
              </label>
              <Input value={createForm.nome_empresa} onChange={e => setCreateForm(p => ({ ...p, nome_empresa: e.target.value }))}
                placeholder="Ex: Higienização Premium" className="bg-secondary border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Nome do Dono
                </label>
                <Input value={createForm.nome_dono} onChange={e => setCreateForm(p => ({ ...p, nome_dono: e.target.value }))}
                  placeholder="João Silva" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </label>
                <Input type="tel" value={createForm.telefone} onChange={e => setCreateForm(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999" className="bg-secondary border-border" />
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Credenciais de Acesso
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail *
                </label>
                <Input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@empresa.com" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Senha *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    className="bg-secondary border-border pr-24"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="p-1.5 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" onClick={() => setCreateForm(p => ({ ...p, password: gerarSenha() }))}
                      className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
                      Gerar
                    </button>
                  </div>
                </div>
                {createForm.password && (
                  <p className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded break-all">
                    {showPassword ? createForm.password : '••••••••••••'}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Período da Assinatura
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
                  <Input type="date" value={createForm.data_inicio}
                    onChange={e => setCreateForm(p => ({ ...p, data_inicio: e.target.value }))}
                    className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Data de Término</label>
                  <Input type="date" value={createForm.data_termino}
                    onChange={e => setCreateForm(p => ({ ...p, data_termino: e.target.value }))}
                    className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full"
              disabled={saving || !createForm.nome_empresa || !createForm.email || !createForm.password}>
              {saving ? 'Criando...' : 'Criar Empresa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Editar ─────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Editar Empresa
            </DialogTitle>
          </DialogHeader>

          {editTarget && (
            <div className="space-y-4 pt-1">

              {/* E-mail — somente leitura */}
              {editTarget.usuario?.email && (
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg border border-border">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Login:</span>
                  <span className="text-sm font-mono text-foreground">{editTarget.usuario.email}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Nome da Empresa *
                </label>
                <Input value={editForm.nome_empresa} onChange={e => setEditForm(p => ({ ...p, nome_empresa: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Nome do Dono
                  </label>
                  <Input value={editForm.nome_dono} onChange={e => setEditForm(p => ({ ...p, nome_dono: e.target.value }))}
                    placeholder="João Silva" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Telefone
                  </label>
                  <Input type="tel" value={editForm.telefone} onChange={e => setEditForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999" className="bg-secondary border-border" />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Período da Assinatura
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Data de Início</label>
                    <Input type="date" value={editForm.data_inicio}
                      onChange={e => setEditForm(p => ({ ...p, data_inicio: e.target.value }))}
                      className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Data de Término</label>
                    <Input type="date" value={editForm.data_termino}
                      onChange={e => setEditForm(p => ({ ...p, data_termino: e.target.value }))}
                      className="bg-secondary border-border" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Status do Acesso
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setEditForm(p => ({ ...p, usuario_status: 'ativo' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      editForm.usuario_status === 'ativo'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}>
                    <CheckCircle2 className="h-4 w-4" /> Ativo
                  </button>
                  <button onClick={() => setEditForm(p => ({ ...p, usuario_status: 'inativo' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      editForm.usuario_status === 'inativo'
                        ? 'bg-red-500/15 border-red-500/50 text-red-400'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}>
                    <XCircle className="h-4 w-4" /> Inativo
                  </button>
                </div>
                {editForm.usuario_status === 'inativo' && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    Ao desativar, o cliente perde acesso imediatamente ao sistema.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={handleEdit} className="flex-1" disabled={saving || !editForm.nome_empresa.trim()}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
                  Cancelar
                </Button>
              </div>

              <div className="border-t border-border pt-3">
                <Button variant="outline"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { setEditTarget(null); setDeleteTarget(editTarget); }}
                  disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Empresa Permanentemente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal Confirmar Exclusão ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive">
              Excluir "{deleteTarget?.nome_empresa}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block mb-2">
                Esta ação é <strong>irreversível</strong>. Serão removidos permanentemente:
              </span>
              <span className="block text-xs text-muted-foreground space-y-0.5">
                <span className="block">• Conta de acesso (auth.users + public.usuarios)</span>
                <span className="block">• Todos os leads e histórico de atendimento</span>
                <span className="block">• Todas as vendas e itens</span>
                <span className="block">• Dados financeiros e regras de automação</span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}