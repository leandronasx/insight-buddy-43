import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Phone, Calendar, Search, Download } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { usePagination } from '@/hooks/usePagination';
import { downloadCSV } from '@/lib/csv-export';
import { PaginationControls } from '@/components/PaginationControls';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type LeadOrigem = Database['public']['Enums']['lead_origem'];
type LeadStatus = Database['public']['Enums']['lead_status'];

const ORIGENS: LeadOrigem[] = ['Tráfego', 'Orgânico', 'Indicação'];
const STATUSES: LeadStatus[] = ['Agendado', 'Sem Interesse', 'Fechado', 'Reabordar'];

const statusColors: Record<string, string> = {
  'Agendado': 'bg-info/20 text-info',
  'Sem Interesse': 'bg-muted text-muted-foreground',
  'Fechado': 'bg-primary/20 text-primary',
  'Reabordar': 'bg-warning/20 text-warning',
};

export default function Leads() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const { leads, isLoading, saveLead, deleteLead } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ nome_lead: string; telefone: string; origem: LeadOrigem; status: LeadStatus; data_mensagem: string; endereco: string; email: string; cpf_cnpj: string }>({
    nome_lead: '', telefone: '', origem: 'Tráfego', status: 'Agendado', data_mensagem: '', endereco: '', email: '', cpf_cnpj: '',
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.nome_lead.toLowerCase().includes(q) ||
      l.telefone?.toLowerCase().includes(q) ||
      l.origem.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const pagination = usePagination(filtered);

  // Reset pagination when search changes
  useEffect(() => { pagination.resetPage(); }, [search]);

  if (isLoading) return <ListSkeleton />;

  const openNew = () => {
    setEditingLead(null);
    const today = new Date();
    setForm({ nome_lead: '', telefone: '', origem: 'Tráfego', status: 'Agendado', data_mensagem: `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`, endereco: '', email: '', cpf_cnpj: '' });
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ nome_lead: lead.nome_lead, telefone: lead.telefone || '', origem: lead.origem, status: lead.status, data_mensagem: lead.data_mensagem, endereco: lead.endereco || '', email: lead.email || '', cpf_cnpj: lead.cpf_cnpj || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa || !form.nome_lead.trim()) return;
    try {
      await saveLead.mutateAsync({
        ...(editingLead ? { id: editingLead.id } : {}),
        ...form,
        empresa_id: empresa.id,
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingLead ? 'Lead atualizado com sucesso!' : 'Lead criado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar lead: ' + error.message);
    }
  };

  const confirmDeleteLead = async () => {
    if (!deleteId) return;
    try {
      await deleteLead.mutateAsync(deleteId);
      setSelectedId(null);
      toast.success('Lead excluído com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao excluir lead: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    downloadCSV(
      `leads_${year}-${String(month).padStart(2, '0')}.csv`,
      ['Nome', 'Telefone', 'Origem', 'Status', 'Data'],
      filtered.map(l => [l.nome_lead, l.telefone, l.origem, l.status, l.data_mensagem])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">Leads</h2>
        {leads.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        )}
      </div>

      {leads.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lead..."
            className="pl-9 bg-secondary border-border"
          />
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            {search ? 'Nenhum lead encontrado.' : 'Nenhum lead neste mês. Clique em + para adicionar.'}
          </p>
        )}
        {pagination.items.map(lead => (
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
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(lead.data_mensagem + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
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
                  <Button size="sm" variant="destructive" onClick={() => setDeleteId(lead.id)}>
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
              <Select value={form.origem} onValueChange={v => setForm({ ...form, origem: v as LeadOrigem })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as LeadStatus })}>
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
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">E-mail</label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">CPF / CNPJ</label>
              <Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Endereço</label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, Número, bairro, CEP, Cidade-UF" className="bg-secondary border-border" />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saveLead.isPending}>
              {saveLead.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLead}
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
