import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Phone, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Lead {
  id: string;
  nome_lead: string;
  telefone: string;
  origem: string;
  status: string;
  data_mensagem: string;
}

const ORIGENS = ['Tráfego', 'Orgânico', 'Indicação'];
const STATUSES = ['Agendado', 'Sem Interesse', 'Fechado', 'Reabordar'];

const statusColors: Record<string, string> = {
  'Agendado': 'bg-info/20 text-info',
  'Sem Interesse': 'bg-muted text-muted-foreground',
  'Fechado': 'bg-primary/20 text-primary',
  'Reabordar': 'bg-warning/20 text-warning',
};

export default function Leads() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ nome_lead: '', telefone: '', origem: 'Tráfego', status: 'Agendado', data_mensagem: '' });

  const fetchLeads = async () => {
    if (!empresa) return;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endM = month === 12 ? 1 : month + 1;
    const endY = month === 12 ? year + 1 : year;
    const end = `${endY}-${String(endM).padStart(2, '0')}-01`;

    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('empresa_id', empresa.id)
      .gte('data_mensagem', start)
      .lt('data_mensagem', end)
      .order('data_mensagem', { ascending: false });

    setLeads(data ?? []);
  };

  useEffect(() => { fetchLeads(); }, [empresa, month, year]);

  const openNew = () => {
    setEditingLead(null);
    const today = new Date();
    setForm({ nome_lead: '', telefone: '', origem: 'Tráfego', status: 'Agendado', data_mensagem: `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` });
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ nome_lead: lead.nome_lead, telefone: lead.telefone || '', origem: lead.origem, status: lead.status, data_mensagem: lead.data_mensagem });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa) return;
    if (editingLead) {
      await supabase.from('leads').update(form).eq('id', editingLead.id);
    } else {
      await supabase.from('leads').insert({ ...form, empresa_id: empresa.id });
    }
    setModalOpen(false);
    setSelectedId(null);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id);
    setSelectedId(null);
    fetchLeads();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground">Leads</h2>

      <div className="space-y-2">
        {leads.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Nenhum lead neste mês. Clique em + para adicionar.</p>
        )}
        {leads.map(lead => (
          <div key={lead.id}>
            <motion.div
              layout
              onClick={() => setSelectedId(selectedId === lead.id ? null : lead.id)}
              className="metric-card cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{lead.nome_lead}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {lead.telefone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(lead.data_mensagem).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{lead.origem}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[lead.status] || ''}`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            </motion.div>
            <AnimatePresence>
              {selectedId === lead.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 px-2 py-2 overflow-hidden"
                >
                  <Button size="sm" variant="outline" onClick={() => openEdit(lead)}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(lead.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={openNew} className="fab-button">
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
              <Input value={form.nome_lead} onChange={e => setForm({ ...form, nome_lead: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Origem</label>
              <Select value={form.origem} onValueChange={v => setForm({ ...form, origem: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
              <Input type="date" value={form.data_mensagem} onChange={e => setForm({ ...form, data_mensagem: e.target.value })} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
