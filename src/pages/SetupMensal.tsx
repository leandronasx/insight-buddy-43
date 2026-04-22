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
  const [investimentoTrafego, setInvestimentoTrafego] = useState('');
  const [custoOperacional, setCustoOperacional] = useState('');
  const [metaFaturamento, setMetaFaturamento] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invTrafegoNum = parseFloat(investimentoTrafego) || 0;
  const custoOpNum = parseFloat(custoOperacional) || 0;
  const metaNum = parseFloat(metaFaturamento) || 0;
  const hasNegative = invTrafegoNum < 0 || custoOpNum < 0 || metaNum < 0;

  useEffect(() => {
    if (!empresa) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('mes_referencia', month)
        .eq('ano_referencia', year)
        .maybeSingle();

      if (data) {
        setInvestimentoTrafego(String(data.investimento_trafego));
        setCustoOperacional(String(data.custo_operacional));
        setMetaFaturamento(String(data.meta_faturamento));
        setExistingId(data.id);
      } else {
        setInvestimentoTrafego('');
        setCustoOperacional('');
        setMetaFaturamento('');
        setExistingId(null);
      }
    };
    fetch();
  }, [empresa, month, year]);

  const handleSave = async () => {
    if (!empresa) return;

    if (hasNegative) {
      toast.error('Os valores do setup não podem ser negativos.');
      return;
    }

    setLoading(true);

    const payload = {
      empresa_id: empresa.id,
      mes_referencia: month,
      ano_referencia: year,
      investimento_trafego: invTrafegoNum,
      custo_operacional: custoOpNum,
      meta_faturamento: metaNum,
    };

    try {
      if (existingId) {
        const { error } = await supabase.from('financeiro_mensal').update(payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('financeiro_mensal').insert(payload).select('id').single();
        if (error) throw error;
        if (data) setExistingId(data.id);
      }
      // Recalcula automaticamente ROI, Lucro Líquido e demais métricas no Dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] });
      toast.success(`Setup de ${label} salvo. ROI e Lucro Líquido recalculados.`);
    } catch (error: any) {
      toast.error('Erro ao salvar setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">Setup Mensal — {label}</h2>

      <div className="space-y-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-info" />
            <label className="text-sm font-medium text-foreground">Investimento em Tráfego (R$)</label>
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={investimentoTrafego}
            onChange={e => setInvestimentoTrafego(e.target.value)}
            placeholder="0.00"
            className={`bg-secondary border-border ${invTrafegoNum < 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          />
          {invTrafegoNum < 0 && <p className="text-xs text-destructive mt-1">Não pode ser negativo.</p>}
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-5 w-5 text-warning" />
            <label className="text-sm font-medium text-foreground">Custo Operacional / Despesas (R$)</label>
          </div>
          <Input
            type="number"
            value={custoOperacional}
            onChange={e => setCustoOperacional(e.target.value)}
            placeholder="0.00"
            className="bg-secondary border-border"
          />
        </div>

        <div className="metric-card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <label className="text-sm font-medium text-foreground">Meta de Faturamento (R$)</label>
          </div>
          <Input
            type="number"
            value={metaFaturamento}
            onChange={e => setMetaFaturamento(e.target.value)}
            placeholder="0.00"
            className="bg-secondary border-border"
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Setup'}
        </Button>
      </div>
    </motion.div>
  );
}
