import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, DollarSign, Target, Briefcase } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetupMensal() {
  const { empresa } = useEmpresa();
  const { month, year, label } = useMonth();
  const queryClient = useQueryClient();
  const [custoAnuncio, setCustoAnuncio] = useState('');
  const [custoOperacional, setCustoOperacional] = useState('');
  const [metaFinanceira, setMetaFinanceira] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const custoAnuncioNum = parseFloat(custoAnuncio) || 0;
  const custoOpNum = parseFloat(custoOperacional) || 0;
  const metaNum = parseFloat(metaFinanceira) || 0;
  const hasNegative = custoAnuncioNum < 0 || custoOpNum < 0 || metaNum < 0;

  useEffect(() => {
    if (!empresa) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('financeiro')
        .select('*')
        .eq('id_empresa', empresa.id)
        .eq('mes', month)
        .eq('ano', year)
        .maybeSingle();

      if (data) {
        setCustoAnuncio(String(data.custo_anuncio ?? 0));
        setCustoOperacional(String(data.custo_operacional ?? 0));
        setMetaFinanceira(String(data.meta_financeira ?? 0));
        setExistingId(data.id);
      } else {
        setCustoAnuncio('');
        setCustoOperacional('');
        setMetaFinanceira('');
        setExistingId(null);
      }
    };
    fetch();
  }, [empresa, month, year]);

  const handleSave = async () => {
    if (!empresa) return;
    if (hasNegative) { toast.error('Os valores não podem ser negativos.'); return; }
    setLoading(true);

    const payload = {
      id_empresa: empresa.id,
      mes: month,
      ano: year,
      custo_anuncio: custoAnuncioNum,
      custo_operacional: custoOpNum,
      meta_financeira: metaNum,
    };

    try {
      if (existingId) {
        const { error } = await supabase.from('financeiro').update(payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('financeiro').insert(payload).select('id').single();
        if (error) throw error;
        if (data) setExistingId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] });
      toast.success(`Setup de ${label} salvo com sucesso!`);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">Setup Financeiro — {label}</h2>

      <div className="space-y-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-info" />
            <label className="text-sm font-medium text-foreground">Custo com Anúncios / Tráfego (R$)</label>
          </div>
          <Input
            type="number" min="0" step="0.01"
            value={custoAnuncio}
            onChange={e => setCustoAnuncio(e.target.value)}
            placeholder="0.00"
            className={`bg-secondary border-border ${custoAnuncioNum < 0 ? 'border-destructive' : ''}`}
          />
          {custoAnuncioNum < 0 && <p className="text-xs text-destructive mt-1">Não pode ser negativo.</p>}
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-5 w-5 text-warning" />
            <label className="text-sm font-medium text-foreground">Custo Operacional / Despesas (R$)</label>
          </div>
          <Input
            type="number" min="0" step="0.01"
            value={custoOperacional}
            onChange={e => setCustoOperacional(e.target.value)}
            placeholder="0.00"
            className={`bg-secondary border-border ${custoOpNum < 0 ? 'border-destructive' : ''}`}
          />
          {custoOpNum < 0 && <p className="text-xs text-destructive mt-1">Não pode ser negativo.</p>}
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <label className="text-sm font-medium text-foreground">Meta de Faturamento (R$)</label>
          </div>
          <Input
            type="number" min="0" step="0.01"
            value={metaFinanceira}
            onChange={e => setMetaFinanceira(e.target.value)}
            placeholder="0.00"
            className={`bg-secondary border-border ${metaNum < 0 ? 'border-destructive' : ''}`}
          />
          {metaNum < 0 && <p className="text-xs text-destructive mt-1">Não pode ser negativo.</p>}
        </div>

        <Button onClick={handleSave} className="w-full" disabled={loading || hasNegative}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Setup'}
        </Button>
      </div>
    </motion.div>
  );
}
