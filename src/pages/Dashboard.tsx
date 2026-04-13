import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Target, BarChart3, Wallet, Receipt, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMonth } from '@/contexts/MonthContext';
import { useDashboardData, useChartData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/date-utils';

export default function Dashboard() {
  const { year } = useMonth();
  const { data, isLoading } = useDashboardData();
  const { data: chartData = [] } = useChartData();




  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  if (isLoading || !data) {
    return <p className="text-muted-foreground animate-pulse text-center py-8">Carregando dashboard...</p>;
  }

  const metaBatida = data.faturamento >= data.metaFaturamento && data.metaFaturamento > 0;
  const faltaMeta = data.metaFaturamento > 0 ? data.metaFaturamento - data.faturamento : 0;

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

      {/* Faturamento, Tráfego, Ticket Médio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Faturamento do Mês</span>
          </div>
          <p className="font-display text-2xl font-bold text-primary">{formatCurrency(data.faturamento)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.totalVendas} venda{data.totalVendas !== 1 ? 's' : ''} realizada{data.totalVendas !== 1 ? 's' : ''}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-destructive" />
            <span className="text-xs text-muted-foreground">Investimento em Tráfego</span>
          </div>
          <p className="font-display text-2xl font-bold text-destructive">{formatCurrency(data.investimentoTrafego)}</p>
          <p className="text-xs text-muted-foreground mt-1">Custo operacional: {formatCurrency(data.custoOperacional)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-info" />
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatCurrency(data.ticketMedio)}</p>
          <p className="text-xs text-muted-foreground mt-1">Valor médio por venda</p>
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
