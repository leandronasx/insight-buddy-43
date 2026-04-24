import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, RotateCcw, CalendarCheck, Star, Save, X, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Regra {
  id: string;
  id_empresa: string;
  tipo_lembrete: string;
  cadencia_envio: number;
  template_mensagem: string | null;
  data_criacao: string;
}

// 4 tipos com lógica de cadência explicada
const TIPOS = [
  {
    value: 'follow_up_pre_orcamento',
    label: 'Follow-up Pré-orçamento',
    sublabel: 'Cadência: dias após data_contato',
    icon: MessageSquare,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    desc: 'Para leads que ainda não receberam orçamento',
  },
  {
    value: 'follow_up_pos_orcamento',
    label: 'Follow-up Pós-orçamento',
    sublabel: 'Cadência: dias após data_orcamento',
    icon: RotateCcw,
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    desc: 'Para leads que já receberam orçamento',
  },
  {
    value: 'lembrete_agendamento',
    label: 'Lembrete de Agendamento',
    sublabel: 'Cadência: dias antes da data_venda',
    icon: CalendarCheck,
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    desc: 'Lembrete enviado antes do serviço agendado',
  },
  {
    value: 'pos_venda',
    label: 'Pós-venda',
    sublabel: 'Cadência: dias após data_servico',
    icon: Star,
    color: 'text-green-400 bg-green-400/10 border-green-400/20',
    desc: 'Mensagem de acompanhamento após o serviço',
  },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  follow_up_pre_orcamento:
    'Olá {nome}! 👋 Tudo bem? Passando para ver se ainda tem interesse no nosso serviço de higienização. Posso enviar um orçamento para você?',
  follow_up_pos_orcamento:
    'Olá {nome}! 😊 Passando para saber se teve alguma dúvida sobre o orçamento que enviamos. Ficamos à disposição!',
  lembrete_agendamento:
    'Olá {nome}! 📅 Lembramos que você tem um serviço agendado conosco em breve. Confirme sua presença respondendo SIM ou NÃO. Obrigado!',
  pos_venda:
    'Olá {nome}! ⭐ Esperamos que tenha ficado satisfeito com o nosso serviço! Pode nos avaliar com uma nota? E se precisar novamente, é só chamar. Obrigado pela confiança!',
};

const emptyForm = {
  tipo_lembrete: 'follow_up_pre_orcamento',
  cadencia_envio: '3',
  template_mensagem: DEFAULT_TEMPLATES['follow_up_pre_orcamento'],
};

export default function Automacoes() {
  const { empresa } = useEmpresa();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ['regras', empresa?.id];

  const { data: regras = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!empresa) return [];
      const { data, error } = await supabase
        .from('regras_automacoes')
        .select('*')
        .eq('id_empresa', empresa.id)
        .order('data_criacao', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Regra[];
    },
    enabled: !!empresa,
    staleTime: 30_000,
  });

  const saveRegra = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id?: string;
      id_empresa: string;
      tipo_lembrete: string;
      cadencia_envio: number;
      template_mensagem: string;
    }) => {
      if (id) {
        const { error } = await supabase.from('regras_automacoes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('regras_automacoes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('regras_automacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      tipo_lembrete: 'follow_up_pre_orcamento',
      cadencia_envio: '3',
      template_mensagem: DEFAULT_TEMPLATES['follow_up_pre_orcamento'],
    });
    setModalOpen(true);
  };

  const openEdit = (r: Regra) => {
    setEditingId(r.id);
    setForm({
      tipo_lembrete: r.tipo_lembrete,
      cadencia_envio: String(r.cadencia_envio),
      template_mensagem: r.template_mensagem || '',
    });
    setModalOpen(true);
  };

  const handleTipoChange = (tipo: string) => {
    setForm(f => ({
      ...f,
      tipo_lembrete: tipo,
      template_mensagem: DEFAULT_TEMPLATES[tipo] || '',
    }));
  };

  const handleSave = async () => {
    if (!empresa) return;
    const dias = parseInt(form.cadencia_envio) || 1;
    if (dias < 1) { toast.error('Cadência deve ser pelo menos 1 dia'); return; }
    try {
      await saveRegra.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        id_empresa: empresa.id,
        tipo_lembrete: form.tipo_lembrete,
        cadencia_envio: dias,
        template_mensagem: form.template_mensagem,
      });
      setModalOpen(false);
      toast.success(editingId ? 'Regra atualizada!' : 'Regra criada!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRegra.mutateAsync(deleteId);
      toast.success('Regra excluída!');
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    } finally {
      setDeleteId(null);
    }
  };

  const getTipoInfo = (tipo: string) =>
    TIPOS.find(t => t.value === tipo) ?? TIPOS[0];

  const selectedTipo = getTipoInfo(form.tipo_lembrete);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">

      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Regras de Automação</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure mensagens automáticas de follow-up, agendamento e pós-venda
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </motion.div>

      {/* Summary cards — 4 tipos */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIPOS.map(tipo => {
          const TipoIcon = tipo.icon;
          const count = regras.filter(r => r.tipo_lembrete === tipo.value).length;
          return (
            <div key={tipo.value} className={`metric-card border ${tipo.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <TipoIcon className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium leading-tight">{tipo.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tipo.sublabel}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-card animate-pulse rounded-xl" />
          ))}
        </div>
      ) : regras.length === 0 ? (
        <motion.div variants={item} className="metric-card flex flex-col items-center py-16 text-center">
          <RotateCcw className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground mb-1">Nenhuma regra criada</p>
          <p className="text-sm text-muted-foreground mb-4">
            Crie regras para automatizar o contato com seus leads
          </p>
          <Button variant="outline" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar primeira regra
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {regras.map(regra => {
              const info = getTipoInfo(regra.tipo_lembrete);
              const InfoIcon = info.icon;
              return (
                <motion.div
                  key={regra.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="metric-card"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${info.color}`}>
                      <InfoIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{info.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {regra.cadencia_envio} dia{regra.cadencia_envio !== 1 ? 's' : ''}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{info.sublabel}</span>
                      </div>
                      {regra.template_mensagem && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {regra.template_mensagem}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(regra)} className="h-8 w-8">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(regra.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? 'Editar Regra' : 'Nova Regra de Automação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Tipo de Mensagem</label>
              <Select value={form.tipo_lembrete} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span>{t.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">— {t.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Cadence hint */}
              <div className={`text-xs px-3 py-2 rounded-lg border ${selectedTipo.color}`}>
                <span className="font-medium">{selectedTipo.sublabel}</span>
                <span className="text-muted-foreground ml-1">— {selectedTipo.desc}</span>
              </div>
            </div>

            {/* Cadência */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Cadência (dias)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={form.cadencia_envio}
                onChange={e => setForm(f => ({ ...f, cadencia_envio: e.target.value }))}
                placeholder="Ex: 3"
              />
              <p className="text-xs text-muted-foreground">
                {form.tipo_lembrete === 'follow_up_pre_orcamento' &&
                  `Envia ${form.cadencia_envio || '?'} dia(s) após o primeiro contato`}
                {form.tipo_lembrete === 'follow_up_pos_orcamento' &&
                  `Envia ${form.cadencia_envio || '?'} dia(s) após o orçamento ser enviado`}
                {form.tipo_lembrete === 'lembrete_agendamento' &&
                  `Envia ${form.cadencia_envio || '?'} dia(s) antes da data do serviço`}
                {form.tipo_lembrete === 'pos_venda' &&
                  `Envia ${form.cadencia_envio || '?'} dia(s) após a realização do serviço`}
              </p>
            </div>

            {/* Template */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Template da Mensagem</label>
              <textarea
                value={form.template_mensagem}
                onChange={e => setForm(f => ({ ...f, template_mensagem: e.target.value }))}
                rows={5}
                placeholder="Use {nome} para o nome do cliente..."
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: <code className="text-primary">{'{nome}'}</code>,{' '}
                <code className="text-primary">{'{dias}'}</code>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saveRegra.isPending} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {saveRegra.isPending ? 'Salvando...' : 'Salvar Regra'}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta regra de automação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
