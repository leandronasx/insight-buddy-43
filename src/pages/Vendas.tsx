import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, Search, Download } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { useVendas, type Venda } from '@/hooks/useVendas';
import { downloadCSV } from '@/lib/csv-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Vendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const { vendas, leadOptions, saveVenda, deleteVenda } = useVendas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lead_id: '', valor_cheio: '', desconto: '0', data_venda: '' });

  const getLeadName = (leadId: string | null) => leadOptions.find(l => l.id === leadId)?.nome_lead || '—';
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = useMemo(() => {
    if (!search.trim()) return vendas;
    const q = search.toLowerCase();
    return vendas.filter(v =>
      getLeadName(v.lead_id).toLowerCase().includes(q) ||
      v.valor_final.toString().includes(q)
    );
  }, [vendas, search, leadOptions]);

  const openNew = () => {
    setEditingVenda(null);
    const today = new Date();
    setForm({ lead_id: '', valor_cheio: '', desconto: '0', data_venda: `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` });
    setModalOpen(true);
  };

  const openEdit = (v: Venda) => {
    setEditingVenda(v);
    setForm({ lead_id: v.lead_id || '', valor_cheio: String(v.valor_cheio), desconto: String(v.desconto), data_venda: v.data_venda });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa) return;
    const valorCheio = parseFloat(form.valor_cheio) || 0;
    if (valorCheio <= 0) {
      alert('Informe um valor cheio válido.');
      return;
    }
    const desconto = parseFloat(form.desconto) || 0;
    const valorFinal = valorCheio - desconto;

    try {
      await saveVenda.mutateAsync({
        ...(editingVenda ? { id: editingVenda.id } : {}),
        lead_id: form.lead_id || null,
        empresa_id: empresa.id,
        valor_cheio: valorCheio,
        desconto,
        valor_final: valorFinal,
        data_venda: form.data_venda,
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingVenda ? 'Venda atualizada com sucesso!' : 'Venda criada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar venda: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
      await deleteVenda.mutateAsync(id);
      setSelectedId(null);
      toast.success('Venda excluída com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao excluir venda: ' + error.message);
    }
  };

  const handleExport = () => {
    downloadCSV(
      `vendas_${year}-${String(month).padStart(2, '0')}.csv`,
      ['Lead', 'Valor Cheio', 'Desconto', 'Valor Final', 'Data'],
      filtered.map(v => [getLeadName(v.lead_id), v.valor_cheio, v.desconto, v.valor_final, v.data_venda])
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
        {filtered.map(v => (
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
                  <p className="font-display font-bold text-primary">{formatCurrency(v.valor_final)}</p>
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
                  className="flex gap-2 px-2 py-2 overflow-hidden"
                >
                  <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <button onClick={openNew} className="fab-button">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{editingVenda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <label className="text-sm font-medium text-foreground mb-1 block">Valor Cheio (R$)</label>
              <Input type="number" value={form.valor_cheio} onChange={e => setForm({ ...form, valor_cheio: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Desconto (R$)</label>
              <Input type="number" value={form.desconto} onChange={e => setForm({ ...form, desconto: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div className="metric-card">
              <p className="text-sm text-muted-foreground">Valor Final</p>
              <p className="font-display text-xl font-bold text-primary">
                {formatCurrency((parseFloat(form.valor_cheio) || 0) - (parseFloat(form.desconto) || 0))}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data da Venda</label>
              <Input type="date" value={form.data_venda} onChange={e => setForm({ ...form, data_venda: e.target.value })} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saveVenda.isPending}>
              {saveVenda.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
