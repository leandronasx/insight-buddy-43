import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Venda {
  id: string;
  lead_id: string | null;
  valor_cheio: number;
  desconto: number;
  valor_final: number;
  data_venda: string;
}

interface LeadOption {
  id: string;
  nome_lead: string;
}

export default function Vendas() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [form, setForm] = useState({ lead_id: '', valor_cheio: '', desconto: '0', data_venda: '' });

  const fetchVendas = async () => {
    if (!empresa) return;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endM = month === 12 ? 1 : month + 1;
    const endY = month === 12 ? year + 1 : year;
    const end = `${endY}-${String(endM).padStart(2, '0')}-01`;

    const { data } = await supabase
      .from('vendas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .gte('data_venda', start)
      .lt('data_venda', end)
      .order('data_venda', { ascending: false });

    setVendas(data ?? []);

    // Fetch leads for dropdown
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, nome_lead')
      .eq('empresa_id', empresa.id)
      .order('nome_lead');

    setLeads(leadsData ?? []);
  };

  useEffect(() => { fetchVendas(); }, [empresa, month, year]);

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

    const payload = {
      lead_id: form.lead_id || null,
      empresa_id: empresa.id,
      valor_cheio: valorCheio,
      desconto,
      valor_final: valorFinal,
      data_venda: form.data_venda,
    };

    let error;
    if (editingVenda) {
      ({ error } = await supabase.from('vendas').update(payload).eq('id', editingVenda.id));
    } else {
      ({ error } = await supabase.from('vendas').insert(payload));
    }
    if (error) {
      alert('Erro ao salvar: ' + error.message);
      return;
    }
    setModalOpen(false);
    setSelectedId(null);
    fetchVendas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    setSelectedId(null);
    fetchVendas();
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getLeadName = (leadId: string | null) => leads.find(l => l.id === leadId)?.nome_lead || '—';

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground">Vendas</h2>

      <div className="space-y-2">
        {vendas.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Nenhuma venda neste mês. Clique em + para adicionar.</p>
        )}
        {vendas.map(v => (
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
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome_lead}</SelectItem>)}
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
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
