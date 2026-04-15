import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Download, Wrench } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { useServicos, type Servico, type TipoServico } from '@/hooks/useServicos';
import { usePagination } from '@/hooks/usePagination';
import { downloadCSV } from '@/lib/csv-export';
import { formatCurrency } from '@/lib/date-utils';
import { PaginationControls } from '@/components/PaginationControls';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Constants } from '@/integrations/supabase/types';

const TIPOS_SERVICO = Constants.public.Enums.tipo_servico;

const tipoLabels: Record<TipoServico, string> = {
  'higienização': 'Higienização',
  'impermeabilização': 'Impermeabilização',
  'higienização e impermeabilização': 'Hig. + Impermeabilização',
};

export default function Servicos() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const { servicos, vendaOptions, leadOptions, isLoading, saveServico, deleteServico } = useServicos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    venda_id: '',
    lead_id: '',
    tipo_servico: 'higienização' as TipoServico,
    estofado: '',
    valor: '',
  });

  const getLeadName = (leadId: string | null) => leadOptions.find(l => l.id === leadId)?.nome_lead || '—';

  const filtered = useMemo(() => {
    if (!search.trim()) return servicos;
    const q = search.toLowerCase();
    return servicos.filter(s =>
      s.tipo_servico.toLowerCase().includes(q) ||
      (s.estofado || '').toLowerCase().includes(q) ||
      getLeadName(s.lead_id).toLowerCase().includes(q)
    );
  }, [servicos, search, leadOptions]);

  const pagination = usePagination(filtered);

  useEffect(() => { pagination.resetPage(); }, [search]);

  if (isLoading) return <ListSkeleton />;

  const openNew = () => {
    setEditingServico(null);
    setForm({ venda_id: '', lead_id: '', tipo_servico: 'higienização', estofado: '', valor: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Servico) => {
    setEditingServico(s);
    setForm({
      venda_id: s.venda_id || '',
      lead_id: s.lead_id || '',
      tipo_servico: s.tipo_servico,
      estofado: s.estofado || '',
      valor: String(s.valor),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa) return;
    const valor = parseFloat(form.valor) || 0;
    if (valor <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    try {
      await saveServico.mutateAsync({
        ...(editingServico ? { id: editingServico.id } : {}),
        empresa_id: empresa.id,
        venda_id: form.venda_id || null,
        lead_id: form.lead_id || null,
        tipo_servico: form.tipo_servico,
        estofado: form.estofado || null,
        valor,
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingServico ? 'Serviço atualizado!' : 'Serviço criado!');
    } catch (error: any) {
      toast.error('Erro ao salvar serviço: ' + error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteServico.mutateAsync(deleteId);
      setSelectedId(null);
      toast.success('Serviço excluído!');
    } catch (error: any) {
      toast.error('Erro ao excluir serviço: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    downloadCSV(
      `servicos_${year}-${String(month).padStart(2, '0')}.csv`,
      ['Tipo', 'Estofado', 'Valor', 'Lead', 'Venda ID'],
      filtered.map(s => [tipoLabels[s.tipo_servico], s.estofado || '', s.valor, getLeadName(s.lead_id), s.venda_id || ''])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">Serviços</h2>
        {servicos.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        )}
      </div>

      {servicos.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar serviço..."
            className="pl-9 bg-secondary border-border"
          />
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            {search ? 'Nenhum serviço encontrado.' : 'Nenhum serviço neste mês. Clique em + para adicionar.'}
          </p>
        )}
        {pagination.items.map(s => (
          <div key={s.id}>
            <motion.div
              layout
              onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
              className="metric-card cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <p className="font-medium text-foreground">{tipoLabels[s.tipo_servico]}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {s.estofado && <span>{s.estofado}</span>}
                    <span>{getLeadName(s.lead_id)}</span>
                  </div>
                </div>
                <p className="font-display font-bold text-primary">{formatCurrency(s.valor)}</p>
              </div>
            </motion.div>
            <AnimatePresence>
              {selectedId === s.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 px-2 py-2 overflow-hidden"
                >
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={pagination.goToPage}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
      />

      <button onClick={openNew} className="fab-button">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{editingServico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo de Serviço</label>
              <Select value={form.tipo_servico} onValueChange={v => setForm({ ...form, tipo_servico: v as TipoServico })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICO.map(t => <SelectItem key={t} value={t}>{tipoLabels[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Estofado</label>
              <Input value={form.estofado} onChange={e => setForm({ ...form, estofado: e.target.value })} placeholder="Ex: Sofá 3 lugares" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor (R$)</label>
              <Input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Lead (opcional)</label>
              <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar lead" /></SelectTrigger>
                <SelectContent>
                  {leadOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.nome_lead}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Venda vinculada (opcional)</label>
              <Select value={form.venda_id} onValueChange={v => setForm({ ...form, venda_id: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Vincular a uma venda" /></SelectTrigger>
                <SelectContent>
                  {vendaOptions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR')} — {formatCurrency(v.valor_final)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saveServico.isPending}>
              {saveServico.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
