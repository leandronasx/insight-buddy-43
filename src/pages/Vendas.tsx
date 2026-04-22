import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, Search, Download, X, FileText } from 'lucide-react';
import { gerarOrdemServicoPDF } from '@/lib/pdf-ordem-servico';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { useVendas, type VendaComServicos } from '@/hooks/useVendas';
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

interface ServicoRow {
  estofado: string;
  valor: string;
}

export default function Vendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const { vendas, leadOptions, isLoading, saveVenda, deleteVenda } = useVendas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<VendaComServicos | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lead_id: '', desconto: '0', data_venda: '', data_agendada: '', horario_agendado: '' });
  const [servicoRows, setServicoRows] = useState<ServicoRow[]>([{ estofado: '', valor: '' }]);

  const getLeadName = (leadId: string | null) => leadOptions.find(l => l.id === leadId)?.nome_lead || '—';

  const filtered = useMemo(() => {
    if (!search.trim()) return vendas;
    const q = search.toLowerCase();
    return vendas.filter(v =>
      getLeadName(v.lead_id).toLowerCase().includes(q) ||
      v.valor_final.toString().includes(q) ||
      v.servicos.some(s => (s.estofado || '').toLowerCase().includes(q))
    );
  }, [vendas, search, leadOptions]);

  const pagination = usePagination(filtered);

  useEffect(() => { pagination.resetPage(); }, [search]);

  if (isLoading) return <ListSkeleton />;

  const totalServicos = servicoRows.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
  const desconto = parseFloat(form.desconto) || 0;
  const valorFinal = totalServicos - desconto;

  const openNew = () => {
    setEditingVenda(null);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    // Last valid day of selected month (handles Feb 28/29, 30-day months, etc.)
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const day = isCurrentMonth ? today.getDate() : Math.min(today.getDate(), lastDayOfMonth);
    setForm({
      lead_id: '',
      desconto: '0',
      data_venda: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      data_agendada: '',
      horario_agendado: '',
    });
    setServicoRows([{ estofado: '', valor: '' }]);
    setModalOpen(true);
  };

  const openEdit = (v: VendaComServicos) => {
    setEditingVenda(v);
    setForm({
      lead_id: v.lead_id || '',
      desconto: String(v.desconto),
      data_venda: v.data_venda,
      data_agendada: v.data_agendada || '',
      horario_agendado: v.horario_agendado || '',
    });
    setServicoRows(
      v.servicos.length > 0
        ? v.servicos.map(s => ({ estofado: s.estofado || '', valor: String(s.valor) }))
        : [{ estofado: '', valor: '' }]
    );
    setModalOpen(true);
  };

  const updateServicoRow = (index: number, field: keyof ServicoRow, value: string) => {
    setServicoRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addServicoRow = () => {
    setServicoRows(prev => [...prev, { estofado: '', valor: '' }]);
  };

  const removeServicoRow = (index: number) => {
    setServicoRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!empresa) return;

    // Validação: nenhum serviço com valor negativo
    const hasNegativeServico = servicoRows.some(r => (parseFloat(r.valor) || 0) < 0);
    if (hasNegativeServico) {
      toast.error('Valores de serviço não podem ser negativos.');
      return;
    }

    const validRows = servicoRows.filter(r => (parseFloat(r.valor) || 0) > 0);
    if (validRows.length === 0) {
      toast.error('Adicione pelo menos um estofado/serviço com valor maior que zero.');
      return;
    }

    // Validação: desconto não pode ser negativo nem maior/igual ao total
    if (desconto < 0) {
      toast.error('O desconto não pode ser negativo.');
      return;
    }
    if (desconto >= totalServicos) {
      toast.error('O desconto não pode ser maior ou igual ao valor total dos serviços.');
      return;
    }
    if (valorFinal <= 0) {
      toast.error('O valor final da venda deve ser maior que zero.');
      return;
    }

    // Validação: data da venda dentro do mês/ano selecionado no filtro global
    if (form.data_venda) {
      const [yStr, mStr] = form.data_venda.split('-');
      const yNum = parseInt(yStr, 10);
      const mNum = parseInt(mStr, 10);
      if (yNum !== year || mNum !== month) {
        toast.error('A data da venda deve estar dentro do mês selecionado no filtro.');
        return;
      }
    } else {
      toast.error('Informe a data da venda.');
      return;
    }

    try {
      await saveVenda.mutateAsync({
        ...(editingVenda ? { id: editingVenda.id } : {}),
        lead_id: form.lead_id || null,
        empresa_id: empresa.id,
        valor_cheio: totalServicos,
        desconto,
        valor_final: valorFinal,
        data_venda: form.data_venda,
        data_agendada: form.data_agendada || null,
        horario_agendado: form.horario_agendado || null,
        servicos: validRows.map(r => ({ estofado: r.estofado, valor: parseFloat(r.valor) || 0 })),
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingVenda ? 'Venda atualizada com sucesso!' : 'Venda criada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar venda: ' + error.message);
    }
  };

  const confirmDeleteVenda = async () => {
    if (!deleteId) return;
    try {
      await deleteVenda.mutateAsync(deleteId);
      setSelectedId(null);
      toast.success('Venda excluída com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao excluir venda: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    downloadCSV(
      `vendas_${year}-${String(month).padStart(2, '0')}.csv`,
      ['Lead', 'Estofados', 'Valor Cheio', 'Desconto', 'Valor Final', 'Data'],
      filtered.map(v => [
        getLeadName(v.lead_id),
        v.servicos.map(s => s.estofado || '').filter(Boolean).join(', '),
        v.valor_cheio, v.desconto, v.valor_final, v.data_venda,
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">Vendas</h2>
        {vendas.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        )}
      </div>

      {vendas.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar venda..."
            className="pl-9 bg-secondary border-border"
          />
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            {search ? 'Nenhuma venda encontrada.' : 'Nenhuma venda neste mês. Clique em + para adicionar.'}
          </p>
        )}
        {pagination.items.map(v => (
          <div key={v.id}>
            <motion.div
              layout
              onClick={() => setSelectedId(selectedId === v.id ? null : v.id)}
              className="metric-card cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{getLeadName(v.lead_id)}</p>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />{new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-positive">{formatCurrency(v.valor_final)}</p>
                  {v.desconto > 0 && (
                    <p className="text-xs text-muted-foreground line-through">{formatCurrency(v.valor_cheio)}</p>
                  )}
                </div>
              </div>
            </motion.div>
            <AnimatePresence>
              {selectedId === v.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 px-2 py-2 overflow-hidden flex-wrap"
                >
                  <Button size="sm" variant="outline" onClick={async () => {
                    const lead = leadOptions.find(l => l.id === v.lead_id);
                    try {
                      await gerarOrdemServicoPDF({
                        venda: v,
                        empresa: empresa!,
                        lead: lead || null,
                      });
                      toast.success('Ordem de Serviço gerada!');
                    } catch (err) {
                      console.error(err);
                      toast.error('Falha ao gerar OS');
                    }
                  }}>
                    <FileText className="h-4 w-4 mr-1" /> Gerar OS
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(v.id)}>
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
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingVenda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Selecionar Lead *</label>
              <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecionar lead" /></SelectTrigger>
                <SelectContent>
                  {leadOptions.map(l => <SelectItem key={l.id} value={l.id}>{l.nome_lead}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.lead_id && (
                <p className="text-xs mt-1 text-positive">✓ Lead selecionado: {getLeadName(form.lead_id)}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data da Venda *</label>
              <Input type="date" value={form.data_venda} onChange={e => setForm({ ...form, data_venda: e.target.value })} className="bg-secondary border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Data Agendada</label>
                <Input type="date" value={form.data_agendada} onChange={e => setForm({ ...form, data_agendada: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Horário</label>
                <Input type="time" value={form.horario_agendado} onChange={e => setForm({ ...form, horario_agendado: e.target.value })} className="bg-secondary border-border" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Estofados / Serviços</label>
                <button type="button" onClick={addServicoRow} className="text-sm hover:underline text-primary">
                  + Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {servicoRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={row.estofado}
                      onChange={e => updateServicoRow(i, 'estofado', e.target.value)}
                      placeholder="Ex: sofá em L"
                      className="bg-secondary border-border flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={row.valor}
                      onChange={e => updateServicoRow(i, 'valor', e.target.value)}
                      placeholder="Valor"
                      className={`bg-secondary border-border w-24 ${(parseFloat(row.valor) || 0) < 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {servicoRows.length > 1 && (
                      <button type="button" onClick={() => removeServicoRow(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="metric-card">
              <p className="text-sm text-muted-foreground">Valor Total (R$)</p>
              <p className="font-display text-lg font-bold text-foreground">{formatCurrency(totalServicos)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Desconto (R$)</label>
              <Input
                type="number"
                min="0"
                value={form.desconto}
                onChange={e => setForm({ ...form, desconto: e.target.value })}
                className={`bg-secondary border-border ${(desconto < 0 || desconto >= totalServicos) && totalServicos > 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {desconto < 0 && (
                <p className="text-xs text-destructive mt-1">Desconto não pode ser negativo.</p>
              )}
              {desconto >= totalServicos && totalServicos > 0 && (
                <p className="text-xs text-destructive mt-1">Desconto não pode ser maior ou igual ao valor total.</p>
              )}
            </div>

            <div className="metric-card">
              <p className="text-sm text-muted-foreground">Valor Final (R$)</p>
              <p className={`font-display text-xl font-bold ${valorFinal > 0 ? 'text-positive' : 'text-destructive'}`}>{formatCurrency(valorFinal)}</p>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveVenda.isPending}>
              {saveVenda.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Os serviços vinculados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVenda}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
