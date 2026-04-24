import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Download, X, Eye } from 'lucide-react';
import { OSPreviewModal } from '@/components/OSPreviewModal';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { useVendas, type VendaComItens } from '@/hooks/useVendas';
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
import { Badge } from '@/components/ui/badge';





interface ItemRow { estofado: string; valor: string; bonus: string; }

export default function Vendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const { vendas, leadOptions, isLoading, saveVenda, deleteVenda } = useVendas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [osPreviewVenda, setOsPreviewVenda] = useState<VendaComItens | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<VendaComItens | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lead_id: '',  data_venda: '', data_agendada: '', horario_agendado: '' });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ estofado: '', valor: '', bonus: '0' }]);

  const getLeadName = (leadId: string) => leadOptions.find(l => l.id === leadId)?.nome_lead ?? '—';

  const filtered = useMemo(() => {
    if (!search.trim()) return vendas;
    const q = search.toLowerCase();
    return vendas.filter(v =>
      getLeadName(v.lead_id).toLowerCase().includes(q) ||
      ("").toLowerCase().includes(q)
    );
  }, [vendas, search, leadOptions]);

  const pagination = usePagination(filtered);
  useEffect(() => { pagination.resetPage(); }, [search]);

  if (isLoading) return <ListSkeleton />;

  const today = new Date().toISOString().split('T')[0];
  const totalItens = itemRows.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);

  const openNew = () => {
    setEditingVenda(null);
    setForm({ lead_id: '',  data_venda: today, data_agendada: '', horario_agendado: '' });
    setItemRows([{ estofado: '', valor: '', bonus: '0' }]);
    setModalOpen(true);
  };

  const openEdit = (v: VendaComItens) => {
    setEditingVenda(v);
    setForm({
      lead_id: v.lead_id,

      data_venda: v.data_venda,
      data_agendada: v.data_agendada || '',
      horario_agendado: v.horario_agendado?.slice(0, 5) || '',
    });
    setItemRows(v.servicos && v.servicos.length > 0
      ? v.servicos.map((i: any) => ({ estofado: i.estofado || '', valor: String(i.valor || 0), bonus: '0' }))
      : [{ estofado: '', valor: '', bonus: '0' }]
    );
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa || !form.lead_id) { toast.error('Selecione um lead'); return; }
    try {
      await saveVenda.mutateAsync({
        ...(editingVenda ? { id: editingVenda.id } : {}),
        lead_id: form.lead_id,

        data_venda: form.data_venda || today,
        data_agendada: form.data_agendada || null,
        horario_agendado: form.horario_agendado || null,
        servicos: itemRows
          .filter(r => r.estofado.trim())
          .map(r => ({ estofado: r.estofado, valor: parseFloat(r.valor) || 0, bonus: parseFloat(r.bonus) || 0 })),
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingVenda ? 'Venda atualizada!' : 'Venda criada!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteVenda.mutateAsync(deleteId);
      setSelectedId(null);
      toast.success('Venda excluída!');
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally { setDeleteId(null); }
  };

  const addItemRow = () => setItemRows(r => [...r, { estofado: '', valor: '', bonus: '0' }]);
  const removeItemRow = (i: number) => setItemRows(r => r.filter((_, idx) => idx !== i));
  const updateItemRow = (i: number, field: keyof ItemRow, value: string) =>
    setItemRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar venda..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() =>
          downloadCSV(
            ['Lead', 'Status', 'Data Venda', 'Data Serviço', 'Total'],
            filtered.map(v => [getLeadName(v.lead_id), "", v.data_venda, v.data_agendada ?? '', formatCurrency(v.valor_total)])
          )
        }>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Venda</Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} vendas · Total: {formatCurrency(filtered.reduce((s, v) => s + v.valor_total, 0))}</p>

      {/* List */}
      <div className="space-y-2">
        {pagination.items.map(v => (
          <motion.div key={v.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="metric-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
            onClick={() => setSelectedId(selectedId === v.id ? null : v.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{getLeadName(v.lead_id)}</p>

                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>Venda: {new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  {v.data_agendada && <span>Serviço: {new Date(v.data_agendada + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}

                </div>
              </div>
              <span className="font-display font-bold text-positive flex-shrink-0">{formatCurrency(v.valor_total)}</span>
            </div>

            <AnimatePresence>
              {selectedId === v.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 mt-3 overflow-hidden flex-wrap"
                >
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setOsPreviewVenda(v); }}>
                    <Eye className="h-4 w-4 mr-1" /> Ver OS
                  </Button>
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(v); }}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setDeleteId(v.id); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {pagination.items.length === 0 && (
          <div className="metric-card text-center py-12 text-muted-foreground">Nenhuma venda encontrada</div>
        )}
      </div>

      <PaginationControls page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
        onPageChange={pagination.goToPage} hasNext={pagination.hasNext} hasPrev={pagination.hasPrev} />

      <button onClick={openNew} className="fab-button"><Plus className="h-6 w-6" /></button>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingVenda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Lead */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Lead / Cliente *</label>
              <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o lead" /></SelectTrigger>
                <SelectContent>
                  {leadOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.nome_lead}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status + Data venda */}
            <div className="grid grid-cols-2 gap-3">

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Data da Venda</label>
                <Input type="date" value={form.data_venda} onChange={e => setForm({ ...form, data_venda: e.target.value })} />
              </div>
            </div>

            {/* Data serviço + Horário */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Data do Serviço</label>
                <Input type="date" value={form.data_agendada} onChange={e => setForm({ ...form, data_agendada: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Horário</label>
                <Input type="time" value={form.horario_agendado} onChange={e => setForm({ ...form, horario_agendado: e.target.value })} />
              </div>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-medium">Itens / Serviços</label>
                <Button size="sm" variant="outline" onClick={addItemRow} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {itemRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Estofado / item"
                    value={row.estofado}
                    onChange={e => updateItemRow(i, 'estofado', e.target.value)}
                    className="flex-[2]"
                  />
                  <Input
                    placeholder="Valor R$"
                    type="number"
                    value={row.valor}
                    onChange={e => updateItemRow(i, 'valor', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Bônus"
                    type="number"
                    value={row.bonus}
                    onChange={e => updateItemRow(i, 'bonus', e.target.value)}
                    className="flex-1"
                  />
                  {itemRows.length > 1 && (
                    <button onClick={() => removeItemRow(i)} className="text-destructive hover:text-destructive/80 flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {totalItens > 0 && (
                <div className="text-right text-sm font-semibold text-positive">
                  Total: {formatCurrency(totalItens)}
                </div>
              )}
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveVenda.isPending}>
              {saveVenda.isPending ? 'Salvando...' : 'Salvar Venda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Os servicos vinculados também serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OS Preview */}
      {osPreviewVenda && empresa && (
        <OSPreviewModal
          open={!!osPreviewVenda}
          onClose={() => setOsPreviewVenda(null)}
          venda={osPreviewVenda}
          empresa={empresa}
          lead={leadOptions.find(l => l.id === osPreviewVenda.lead_id) || null}
        />
      )}
    </div>
  );
}
