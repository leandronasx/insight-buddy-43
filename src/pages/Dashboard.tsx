import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';

interface DashboardData {
  totalLeads: number;
  leadsTrafego: number;
  leadsOrganico: number;
  leadsIndicacao: number;
  leadsFechados: number;
  conversao: number;
  faturamento: number;
  investimentoTrafego: number;
  custoOperacional: number;
  metaFaturamento: number;
  roi: number;
  cac: number;
  lucroLiquido: number;
}

const initialData: DashboardData = {
  totalLeads: 0, leadsTrafego: 0, leadsOrganico: 0, leadsIndicacao: 0,
  leadsFechados: 0, conversao: 0, faturamento: 0, investimentoTrafego: 0,
  custoOperacional: 0, metaFaturamento: 0, roi: 0, cac: 0, lucroLiquido: 0,
};

export default function Dashboard() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();
  const [data, setData] = useState<DashboardData>(initialData);
  const [chartData, setChartData] = useState<{ mes: string; faturamento: number }[]>([]);

  useEffect(() => {
    if (!empresa) return;

    const fetchData = async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      // Fetch leads for this month
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('data_mensagem', startDate)
        .lt('data_mensagem', endDate);

      // Fetch vendas for this month
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', startDate)
        .lt('data_venda', endDate);

      // Fetch financeiro
      const { data: fin } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('mes_referencia', month)
        .eq('ano_referencia', year)
        .maybeSingle();

      const totalLeads = leads?.length ?? 0;
      const leadsTrafego = leads?.filter(l => l.origem === 'Tráfego').length ?? 0;
      const leadsOrganico = leads?.filter(l => l.origem === 'Orgânico').length ?? 0;
      const leadsIndicacao = leads?.filter(l => l.origem === 'Indicação').length ?? 0;
      const leadsFechados = leads?.filter(l => l.status === 'Fechado').length ?? 0;
      const conversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
      const faturamento = vendas?.reduce((acc, v) => acc + Number(v.valor_final), 0) ?? 0;
      const investimentoTrafego = Number(fin?.investimento_trafego ?? 0);
      const custoOperacional = Number(fin?.custo_operacional ?? 0);
      const metaFaturamento = Number(fin?.meta_faturamento ?? 0);
      const roi = investimentoTrafego > 0 ? (faturamento / investimentoTrafego) : 0;
      const cac = leadsFechados > 0 ? (investimentoTrafego / leadsFechados) : 0;
      const lucroLiquido = faturamento - (investimentoTrafego + custoOperacional);

      setData({
        totalLeads, leadsTrafego, leadsOrganico, leadsIndicacao,
        leadsFechados, conversao, faturamento, investimentoTrafego,
        custoOperacional, metaFaturamento, roi, cac, lucroLiquido,
      });

      // Fetch annual chart data
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const annualStart = `${year}-01-01`;
      const annualEnd = `${year + 1}-01-01`;

      const { data: allVendas } = await supabase
        .from('vendas')
        .select('valor_final, data_venda')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', annualStart)
        .lt('data_venda', annualEnd);

      const chart = months.map((mes, i) => {
        const monthVendas = allVendas?.filter(v => {
          const d = new Date(v.data_venda);
          return d.getMonth() === i;
        }) ?? [];
        const fat = monthVendas.reduce((acc, v) => acc + Number(v.valor_final), 0);
        return { mes, faturamento: fat };
      });

      setChartData(chart);
    };

    fetchData();
  }, [empresa, month, year]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const metaBatida = data.faturamento >= data.metaFaturamento && data.metaFaturamento > 0;
  const faltaMeta = data.metaFaturamento > 0 ? data.metaFaturamento - data.faturamento : 0;

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Meta Status */}
      {data.metaFaturamento > 0 && (
        <motion.div
          variants={item}
          className={`metric-card flex items-center gap-4 ${metaBatida ? 'border-primary/50' : 'border-warning/50'}`}
        >
          <Target className={`h-8 w-8 ${metaBatida ? 'text-primary' : 'text-warning'}`} />
          <div>
            <p className="text-sm text-muted-foreground">Meta do Mês</p>
            <p className="font-display text-lg font-bold text-foreground">
              {metaBatida
                ? `✅ Meta batida! ${formatCurrency(data.faturamento)} / ${formatCurrency(data.metaFaturamento)}`
                : `⚠️ Faltam ${formatCurrency(faltaMeta)} para bater a meta`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Lead cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-info" />
            <span className="text-xs text-muted-foreground">Total Leads</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{data.totalLeads}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Conversão</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{data.conversao.toFixed(1)}%</p>
        </motion.div>

        <motion.div variants={item} className="metric-card col-span-2">
          <span className="text-xs text-muted-foreground mb-2 block">Origem dos Leads</span>
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tráfego</p>
              <p className="font-display text-lg font-bold text-info">{data.leadsTrafego}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Orgânico</p>
              <p className="font-display text-lg font-bold text-primary">{data.leadsOrganico}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Indicação</p>
              <p className="font-display text-lg font-bold text-warning">{data.leadsIndicacao}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-info" />
            <span className="text-xs text-muted-foreground">ROI (Fat/Tráfego)</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{data.roi.toFixed(2)}x</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-warning" />
            <span className="text-xs text-muted-foreground">CAC (Tráfego/Vendas)</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatCurrency(data.cac)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className={`h-5 w-5 ${data.lucroLiquido >= 0 ? 'text-primary' : 'text-destructive'}`} />
            <span className="text-xs text-muted-foreground">Lucro Líquido</span>
          </div>
          <p className={`font-display text-2xl font-bold ${data.lucroLiquido >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(data.lucroLiquido)}
          </p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div variants={item} className="metric-card">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Faturamento Mensal — {year}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
              <XAxis dataKey="mes" stroke="hsl(215, 15%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(220, 18%, 14%)', border: '1px solid hsl(220, 15%, 22%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }}
                formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              />
              <Bar dataKey="faturamento" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
