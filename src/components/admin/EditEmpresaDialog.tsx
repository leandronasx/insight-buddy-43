import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Empresa {
  id: string;
  user_id: string;
  empresa_nome: string;
  nome_dono: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
}

interface Props {
  empresa: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEmpresaDialog({ empresa, open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({
    empresa_nome: '',
    nome_dono: '',
    data_inicio: '',
    data_termino: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresa) {
      setForm({
        empresa_nome: empresa.empresa_nome,
        nome_dono: empresa.nome_dono || '',
        data_inicio: empresa.data_inicio || '',
        data_termino: empresa.data_termino || '',
        status: empresa.status,
      });
      setError('');
      setConfirmDelete(false);
    }
  }, [empresa]);

  const handleEdit = async () => {
    if (!empresa) return;
    setError('');
    setSaving(true);

    const { error: updateErr } = await supabase
      .from('empresas')
      .update({
        empresa_nome: form.empresa_nome,
        nome_dono: form.nome_dono || null,
        data_inicio: form.data_inicio || null,
        data_termino: form.data_termino || null,
        status: form.status,
      })
      .eq('id', empresa.id);

    if (updateErr) {
      setError(updateErr.message);
      toast.error('Erro ao salvar: ' + updateErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    toast.success('Empresa atualizada com sucesso!');
    onSuccess();
  };

  const handleDelete = async () => {
    if (!empresa) return;
    setError('');
    setDeleting(true);

    const res = await supabase.functions.invoke('delete-empresa', {
      body: { empresa_id: empresa.id },
    });

    if (res.error || res.data?.error) {
      const msg = res.error?.message || res.data?.error || 'Erro ao excluir empresa';
      setError(msg);
      toast.error(msg);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onOpenChange(false);
    setConfirmDelete(false);
    toast.success('Empresa excluída com sucesso!');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Empresa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome da Empresa *</label>
            <Input value={form.empresa_nome} onChange={e => setForm({ ...form, empresa_nome: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome do Dono</label>
            <Input value={form.nome_dono} onChange={e => setForm({ ...form, nome_dono: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data de Início</label>
              <Input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data de Término</label>
              <Input type="date" value={form.data_termino} onChange={e => setForm({ ...form, data_termino: e.target.value })} className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
            <div className="flex gap-2">
              <Button type="button" variant={form.status === 'ativo' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'ativo' })}>
                <ToggleRight className="h-4 w-4 mr-1" /> Ativo
              </Button>
              <Button type="button" variant={form.status === 'inativo' ? 'destructive' : 'outline'} size="sm" onClick={() => setForm({ ...form, status: 'inativo' })}>
                <ToggleLeft className="h-4 w-4 mr-1" /> Inativo
              </Button>
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleEdit} className="w-full" disabled={saving || deleting || !form.empresa_nome}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>

          <div className="border-t border-border pt-4 mt-2">
            {!confirmDelete ? (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir Empresa
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium text-center">
                  Tem certeza? Todos os dados (leads, vendas, serviços, financeiro) serão removidos permanentemente.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
