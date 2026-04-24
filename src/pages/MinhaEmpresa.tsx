import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Save, Building2, User, MapPin, FileText, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListSkeleton } from '@/components/LoadingSkeleton';

export default function MinhaEmpresa() {
  const { user } = useAuth();
  const { empresa, loading, updateEmpresa } = useEmpresa();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nome_empresa: '',
    nome_dono: '',
    endereco: '',
    cnpj_cpf: '',
    cor_primaria: '#22c55e',
    cor_secundaria: '#0f172a',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (empresa) {
      setForm({
        nome_empresa: empresa.nome_empresa || '',
        nome_dono: empresa.nome_dono || '',
        endereco: empresa.endereco || '',
        cnpj_cpf: empresa.cnpj_cpf || '',
        cor_primaria: empresa.cor_primaria || '#22c55e',
        cor_secundaria: empresa.cor_secundaria || '#0f172a',
      });
      setLogoPreview(empresa.logo_url || null);
    }
  }, [empresa]);

  if (loading) return <ListSkeleton />;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/logo.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
    if (error) { toast.error('Erro ao enviar logo: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
    const logo_url = urlData.publicUrl + '?t=' + Date.now();
    await updateEmpresa.mutateAsync({ logo_url });
    setLogoPreview(logo_url);
    setUploading(false);
    toast.success('Logo atualizada!');
  };

  const handleSave = async () => {
    try {
      await updateEmpresa.mutateAsync({
        nome_empresa: form.nome_empresa,
        nome_dono: form.nome_dono || null,
        endereco: form.endereco || null,
        cnpj_cpf: form.cnpj_cpf || null,
        cor_primaria: form.cor_primaria,
        cor_secundaria: form.cor_secundaria,
      });
      toast.success('Dados salvos com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display text-xl font-bold text-foreground">Minha Empresa</h2>

      {/* Logo */}
      <div className="metric-card flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          {logoPreview
            ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            : <Upload className="h-8 w-8 text-muted-foreground" />
          }
        </div>
        <div>
          <p className="font-medium text-foreground">Logo da Empresa</p>
          <p className="text-sm text-muted-foreground">Clique para enviar ou alterar</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          {uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Nome da Empresa *
            </label>
            <Input value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Proprietário
            </label>
            <Input value={form.nome_dono} onChange={e => setForm({ ...form, nome_dono: e.target.value })} className="bg-secondary border-border" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> CNPJ ou CPF
          </label>
          <Input value={form.cnpj_cpf} onChange={e => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="00.000.000/0001-00" className="bg-secondary border-border" />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Endereço
          </label>
          <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, Número, Bairro, CEP, Cidade-UF" className="bg-secondary border-border" />
        </div>

        {/* Cores */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Cores da Marca
          </label>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input type="color" value={form.cor_primaria} onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <span className="text-sm text-muted-foreground">Primária (botões, sidebar ativa)</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={form.cor_secundaria} onChange={e => setForm({ ...form, cor_secundaria: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <span className="text-sm text-muted-foreground">Secundária (fundo sidebar)</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={updateEmpresa.isPending || !form.nome_empresa}>
        <Save className="h-4 w-4 mr-2" />
        {updateEmpresa.isPending ? 'Salvando...' : 'Salvar Informações'}
      </Button>
    </div>
  );
}
