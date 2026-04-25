import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Trash2, Upload, Building2, User, FileText, MapPin, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Empresa {
  id: string;
  id_usuario: string;
  nome_empresa: string;
  nome_dono: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  endereco?: string | null;
  cnpj_cpf?: string | null;
  logo_url?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
}

interface Props {
  empresa: Empresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEmpresaDialog({ empresa, open, onOpenChange, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nome_empresa: '',
    nome_dono: '',
    data_inicio: '',
    data_termino: '',
    endereco: '',
    cnpj_cpf: '',
    cor_primaria: '#22c55e',
    cor_secundaria: '#0f172a',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresa) {
      setForm({
        nome_empresa: empresa.nome_empresa,
        nome_dono: empresa.nome_dono || '',
        data_inicio: empresa.data_inicio || '',
        data_termino: empresa.data_termino || '',
        endereco: empresa.endereco || '',
        cnpj_cpf: empresa.cnpj_cpf || '',
        cor_primaria: empresa.cor_primaria || '#22c55e',
        cor_secundaria: empresa.cor_secundaria || '#0f172a',
      });
      setLogoPreview(empresa.logo_url || null);
      setError('');
      setConfirmDelete(false);
    }
  }, [empresa]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresa) return;
    const ext = file.name.split('.').pop();
    const filePath = `${empresa.id_usuario}/logo.${ext}`;
    setUploading(true);
    const { error: upErr } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
    if (upErr) { toast.error('Erro ao enviar logo: ' + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
    const logo_url = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('empresas').update({ logo_url }).eq('id', empresa.id);
    setLogoPreview(logo_url);
    setUploading(false);
    toast.success('Logo atualizada!');
    onSuccess();
  };

  const handleEdit = async () => {
    if (!empresa) return;
    setError('');
    setSaving(true);
    const { error: updateErr } = await supabase
      .from('empresas')
      .update({
        nome_empresa: form.nome_empresa,
        nome_dono: form.nome_dono || null,
        data_inicio: form.data_inicio || null,
        data_termino: form.data_termino || null,
        endereco: form.endereco || null,
        cnpj_cpf: form.cnpj_cpf || null,
        cor_primaria: form.cor_primaria,
        cor_secundaria: form.cor_secundaria,
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
      <DialogContent aria-describedby={undefined} className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Empresa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Logo */}
          <div className="metric-card flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                : <Upload className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Logo da Empresa</p>
              <p className="text-xs text-muted-foreground">Clique para enviar/alterar</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Nome da Empresa *</label>
              <Input value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Proprietário</label>
              <Input value={form.nome_dono} onChange={e => setForm({ ...form, nome_dono: e.target.value })} className="bg-secondary border-border" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> CNPJ ou CPF</label>
            <Input value={form.cnpj_cpf} onChange={e => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="00.000.000/0001-00" className="bg-secondary border-border" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Endereço</label>
            <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, Número, bairro, CEP, Cidade-UF" className="bg-secondary border-border" />
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
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Cores da Marca</label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor_primaria} onChange={e => setForm({ ...form, cor_primaria: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                <span className="text-sm text-muted-foreground">Primária</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor_secundaria} onChange={e => setForm({ ...form, cor_secundaria: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                <span className="text-sm text-muted-foreground">Secundária</span>
              </div>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button onClick={handleEdit} className="w-full" disabled={saving || deleting || !form.nome_empresa}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>

          <div className="border-t border-border pt-4 mt-2">
            {!confirmDelete ? (
              <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir Empresa
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium text-center">
                  Tem certeza? Todos os dados serão removidos permanentemente.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
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
