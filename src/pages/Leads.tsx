import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Phone, Search, Download, MessageCircle } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useLeads, type Lead, ORIGENS_LEAD, SITUACOES_CLIENTE, MOMENTOS_FUNIL, QUALIFICACOES } from '@/hooks/useLeads';
import { usePagination } from '@/hooks/usePagination';
import { downloadCSV } from '@/lib/csv-export';
import { PaginationControls } from '@/components/PaginationControls';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const situacaoColors: Record<string, string> = {
  'Novo':          'bg-blue-500/20 text-blue-400',
  'Em negociação': 'bg-purple-500/20 text-purple-400',
  'Agendado':      'bg-info/20 text-info',
  'Fechado':       'bg-primary/20 text-primary',
  'Reabordar':     'bg-warning/20 text-warning',
  'Sem Interesse': 'bg-muted text-muted-foreground',
};

function whatsappUrl(telefone: string | null, nome: string) {
  const num = (telefone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(`Olá ${nome}! 👋`);
  return `https://wa.me/55${num}?text=${msg}`;
}

const emptyForm = {
  nome: '',
  telefone: '',
  email: '',
  cnpj_cpf: '',
  endereco: '',
  origem_lead: 'Tráfego',
  situacao_do_cliente: 'Novo',
  momento_funil: 'Contato',
  qualificacao: 'Morno',
  data_contato: '',
  data_orcamento: '',
  robo_follow_ups: false,
  robo_atendimento: false,
  robo_agendamento: false,
  robo_pos_vendas: false,
};

export default function Leads() {
  const { empresa } = useEmpresa();
  const { leads, isLoading, saveLead, deleteLead } = useLeads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.nome.toLowerCase().includes(q) ||
      l.telefone?.toLowerCase().includes(q) ||
      l.origem_lead?.toLowerCase().includes(q) ||
      l.situacao_do_cliente?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const pagination = usePagination(filtered);
  useEffect(() => { pagination.resetPage(); }, [search]);

  if (isLoading) return <ListSkeleton />;

  const today = new Date().toISOString().split('T')[0];

  const openNew = () => {
    setEditingLead(null);
    setForm({ ...emptyForm, data_contato: today });
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      nome: lead.nome,
      telefone: lead.telefone || '',
      email: lead.email || '',
      cnpj_cpf: lead.cnpj_cpf || '',
      endereco: lead.endereco || '',
      origem_lead: lead.origem_lead || 'Tráfego',
      situacao_do_cliente: lead.situacao_do_cliente || 'Novo',
      momento_funil: lead.momento_funil || 'Contato',
      qualificacao: lead.qualificacao || 'Morno',
      data_contato: lead.data_contato ? lead.data_contato.split('T')[0] : '',
      data_orcamento: lead.data_orcamento ? lead.data_orcamento.split('T')[0] : '',
      robo_follow_ups: lead.robo_follow_ups,
      robo_atendimento: lead.robo_atendimento,
      robo_agendamento: lead.robo_agendamento,
      robo_pos_vendas: lead.robo_pos_vendas,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa || !form.nome.trim()) return;
    try {
      await saveLead.mutateAsync({
        ...(editingLead ? { id: editingLead.id } : {}),
        nome: form.nome,
        telefone: form.telefone || null,
        email: form.email || null,
        cnpj_cpf: form.cnpj_cpf || null,
        endereco: form.endereco || null,
        origem_lead: form.origem_lead || null,
        situacao_do_cliente: form.situacao_do_cliente || null,
        momento_funil: form.momento_funil || null,
        qualificacao: form.qualificacao || null,
        data_contato: form.data_contato ? new Date(form.data_contato + 'T00:00:00').toISOString() : null,
        data_orcamento: form.data_orcamento ? new Date(form.data_orcamento + 'T00:00:00').toISOString() : null,
        robo_follow_ups: form.robo_follow_ups,
        robo_atendimento: form.robo_atendimento,
        robo_agendamento: form.robo_agendamento,
        robo_pos_vendas: form.robo_pos_vendas,
        id_empresa: empresa.id,
      });
      setModalOpen(false);
      setSelectedId(null);
      toast.success(editingLead ? 'Lead atualizado!' : 'Lead criado!');
    } catch (error: any) {
      toast.error('Erro ao salvar lead: ' + error.message);
    }
  };

  const confirmDeleteLead = async () => {
    if (!deleteId) return;
    try {
      await deleteLead.mutateAsync(deleteId);
      setSelectedId(null);
      toast.success('Lead excluído!');
    } catch (error: any) {
      toast.error('Erro ao excluir lead: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() =>
          downloadCSV(
            ['Nome', 'Telefone', 'Origem', 'Situação', 'Data Contato'],
            filtered.map(l => [l.nome, l.telefone, l.origem_lead, l.situacao_do_cliente, l.data_contato ?? ''])
          )
        }>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Lead
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">{filtered.length} leads encontrados</p>

      {/* List */}
      <div className="space-y-2">
        {pagination.items.map(lead => (
          <motion.div
            key={lead.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="metric-card cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
            onClick={() => setSelectedId(selectedId === lead.id ? null : lead.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{lead.nome}</p>
                  <Badge variant="outline" className={`text-xs ${situacaoColors[lead.situacao_do_cliente || 'Novo'] || 'bg-muted text-muted-foreground'}`}>
                    {lead.situacao_do_cliente || 'Novo'}
                  </Badge>
                  {lead.qualificacao && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {lead.qualificacao}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {lead.telefone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</span>
                  )}
                  {lead.origem_lead && <span>{lead.origem_lead}</span>}
                  {lead.momento_funil && <span className="text-primary">{lead.momento_funil}</span>}
                </div>
              </div>
              {lead.telefone && (
                <a
                  href={whatsappUrl(lead.telefone, lead.nome)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>

            <AnimatePresence>
              {selectedId === lead.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 mt-3 overflow-hidden flex-wrap"
                >
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(lead); }}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setDeleteId(lead.id); }}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {pagination.items.length === 0 && (
          <div className="metric-card text-center py-12 text-muted-foreground">
            Nenhum lead encontrado
          </div>
        )}
      </div>

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={pagination.goToPage}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
      />

      {/* FAB */}
      <button onClick={openNew} className="fab-button">
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Nome *</label>
              <Input
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Telefone / WhatsApp</label>
                <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">E-mail</label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </div>
            </div>

            {/* CPF/CNPJ + Endereço */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">CPF / CNPJ</label>
                <Input value={form.cnpj_cpf} onChange={e => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Endereço</label>
                <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número..." />
              </div>
            </div>

            {/* Origem + Situação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Origem</label>
                <Select value={form.origem_lead} onValueChange={v => setForm({ ...form, origem_lead: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORIGENS_LEAD.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Situação</label>
                <Select value={form.situacao_do_cliente} onValueChange={v => setForm({ ...form, situacao_do_cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUACOES_CLIENTE.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Funil + Qualificação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Momento no Funil</label>
                <Select value={form.momento_funil} onValueChange={v => setForm({ ...form, momento_funil: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOMENTOS_FUNIL.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Qualificação</label>
                <Select value={form.qualificacao} onValueChange={v => setForm({ ...form, qualificacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{QUALIFICACOES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Data do Contato</label>
                <Input type="date" value={form.data_contato} onChange={e => setForm({ ...form, data_contato: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Data do Orçamento</label>
                <Input type="date" value={form.data_orcamento} onChange={e => setForm({ ...form, data_orcamento: e.target.value })} />
              </div>
            </div>

            {/* Robôs */}
            <div className="space-y-2 border border-border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Robôs ativos para este lead</p>
              {[
                { key: 'robo_follow_ups', label: 'Follow-up automático' },
                { key: 'robo_atendimento', label: 'Atendimento automático' },
                { key: 'robo_agendamento', label: 'Agendamento automático' },
                { key: 'robo_pos_vendas', label: 'Pós-venda automático' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch
                    checked={form[key as keyof typeof form] as boolean}
                    onCheckedChange={v => setForm({ ...form, [key]: v })}
                  />
                </div>
              ))}
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveLead.isPending}>
              {saveLead.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
