import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const emptyForm = {
  empresa_nome: '',
  nome_dono: '',
  email: '',
  password: '',
  data_inicio: new Date().toISOString().split('T')[0],
  data_termino: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEmpresaDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    const res = await supabase.functions.invoke('create-empresa', {
      body: {
        email: form.email,
        password: form.password,
        empresa_nome: form.empresa_nome,
        nome_dono: form.nome_dono,
        data_inicio: form.data_inicio,
        data_termino: form.data_termino || null,
      },
    });
    if (res.error || res.data?.error) {
      const msg = res.error?.message || res.data?.error || 'Erro ao criar empresa';
      setError(msg);
      toast.error(msg);
      setSaving(false);
      return;
    }
    onOpenChange(false);
    setForm({ ...emptyForm });
    setSaving(false);
    toast.success('Empresa criada com sucesso!');
    onSuccess();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError('');
      setForm({ ...emptyForm });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Empresa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome da Empresa *</label>
            <Input value={form.empresa_nome} onChange={e => setForm({ ...form, empresa_nome: e.target.value })} className="bg-secondary border-border" placeholder="Ex: Estofados Premium" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome do Dono</label>
            <Input value={form.nome_dono} onChange={e => setForm({ ...form, nome_dono: e.target.value })} className="bg-secondary border-border" placeholder="João Silva" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail de Login *</label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border" placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Senha *</label>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="bg-secondary border-border" placeholder="Mínimo 6 caracteres" />
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
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleCreate} className="w-full" disabled={saving || !form.empresa_nome || !form.email || !form.password}>
            {saving ? 'Criando...' : 'Criar Empresa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
