import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const emptyForm = {
  nome_empresa: '',
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

    const { data, error: fnError } = await supabase.functions.invoke('create-empresa', {
      body: {
        email: form.email,
        password: form.password,
        nome_empresa: form.nome_empresa,
        nome_dono: form.nome_dono || null,
        data_inicio: form.data_inicio,
        data_termino: form.data_termino || null,
      },
    });

    if (fnError || data?.error) {
      const msg = fnError?.message || data?.error || 'Erro ao criar empresa';
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

  const handleOpenChange = (o: boolean) => {
    if (!o) { setError(''); setForm({ ...emptyForm }); }
    onOpenChange(o);
  };

  const needsDeploy = error.toLowerCase().includes('edge function') ||
    error.toLowerCase().includes('failed to send') ||
    error.toLowerCase().includes('failed to fetch');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nova Empresa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome da Empresa *</label>
            <Input value={form.nome_empresa}
              onChange={e => setForm({ ...form, nome_empresa: e.target.value })}
              className="bg-secondary border-border" placeholder="Ex: Higienização Premium" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome do Dono</label>
            <Input value={form.nome_dono}
              onChange={e => setForm({ ...form, nome_dono: e.target.value })}
              className="bg-secondary border-border" placeholder="João Silva" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail de Login *</label>
            <Input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="bg-secondary border-border" placeholder="cliente@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Senha *</label>
            <Input type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="bg-secondary border-border" placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data de Início</label>
              <Input type="date" value={form.data_inicio}
                onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data de Término</label>
              <Input type="date" value={form.data_termino}
                onChange={e => setForm({ ...form, data_termino: e.target.value })}
                className="bg-secondary border-border" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1">
              <p className="text-destructive text-sm font-medium">{error}</p>
              {needsDeploy && (
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-destructive/20">
                  <p className="font-semibold">As Edge Functions precisam ser deployadas no Supabase:</p>
                  <code className="block bg-secondary px-2 py-1 rounded text-foreground">
                    npx supabase functions deploy create-empresa
                  </code>
                  <code className="block bg-secondary px-2 py-1 rounded text-foreground">
                    npx supabase functions deploy delete-empresa
                  </code>
                  <code className="block bg-secondary px-2 py-1 rounded text-foreground">
                    npx supabase functions deploy update-empresa-status
                  </code>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleCreate}
            className="w-full"
            disabled={saving || !form.nome_empresa || !form.email || !form.password}
          >
            {saving ? 'Criando...' : 'Criar Empresa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
