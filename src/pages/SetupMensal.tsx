import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, DollarSign, Target, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

export default function SetupMensal() {
  const { empresa } = useEmpresa();
  const { month, year, label } = useMonth();
  const [investimentoTrafego, setInvestimentoTrafego] = useState('');
  const [custoOperacional, setCustoOperacional] = useState('');
  const [metaFaturamento, setMetaFaturamento] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    const payload = {
      empresa_id: empresa.id,
      mes_referencia: month,
      ano_referencia: year,
      investimento_trafego: parseFloat(investimentoTrafego) || 0,
      custo_operacional: parseFloat(custoOperacional) || 0,
      meta_faturamento: parseFloat(metaFaturamento) || 0,
    };

    if (existingId) {
      await supabase.from('financeiro_mensal').update(payload).eq('id', existingId);
    } else {
      await supabase.from('financeiro_mensal').insert(payload);
    }

    toast({ title: 'Salvo!', description: `Setup de ${label} atualizado com sucesso.` });
    setLoading(false);
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
            value={investimentoTrafego}
            onChange={e => setInvestimentoTrafego(e.target.value)}
            placeholder="0.00"
            className="bg-secondary border-border"
          />
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
