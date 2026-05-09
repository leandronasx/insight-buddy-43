import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Target, BarChart3, Wallet, Receipt, Tag, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import { useDashboardData, useChartData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/date-utils';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { year } = useMonth();
  const { data, isLoading } = useDashboardData();
  const { data: chartData = [] } = useChartData();

  const [hasCelebrated, setHasCelebrated] = useState(false);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

  const metaBatida = data ? data.faturamento >= data.metaFaturamento && data.metaFaturamento > 0 : false;
  const faltaMeta = data && data.metaFaturamento > 0 ? data.metaFaturamento - data.faturamento : 0;

  useEffect(() => {
    if (metaBatida && !hasCelebrated) {
      // Dinamicamente injeta o script do confetti para não depender da instalação local via npm/bun
      // Isso evita erros 500 no Vite quando o node_modules não está sincronizado com o dev
      const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: ReturnType<typeof setInterval> = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          // @ts-expect-error window.confetti is loaded dynamically
          if (window.confetti) {
            // @ts-expect-error window.confetti is loaded dynamically
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            // @ts-expect-error window.confetti is loaded dynamically
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
          }
        }, 250);

        setHasCelebrated(true);
      };

      // @ts-expect-error window.confetti is loaded dynamically
      if (typeof window.confetti === 'function') {
        triggerConfetti();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
        script.onload = triggerConfetti;
        document.head.appendChild(script);
      }
    }
  }, [metaBatida, hasCelebrated]);

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Meta Status */}
      {data.metaFaturamento > 0 && (
        <motion.div
          variants={item}
          className={`metric-card space-y-4 ${metaBatida ? 'border-positive/50' : 'border-warning/50'}`}
        >
          <div className="flex items-center gap-4">
            {metaBatida ? (
              <div className="bg-positive/10 p-3 rounded-full">
                <Trophy className="h-8 w-8 text-positive" />
              </div>
            ) : (
              <div className="bg-warning/10 p-3 rounded-full">
                <Target className="h-8 w-8 text-warning" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Meta do Mês</p>
              {metaBatida ? (
                <div>
                  <p className="font-display text-lg md:text-xl font-bold text-foreground">
                    META BATIDA! 🎉
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Parabéns! Você já garantiu {formatCurrency(data.faturamento)} este mês.
                  </p>
                </div>
              ) : (
                <p className="font-display text-lg font-bold text-foreground">
                  ⚠️ Faltam {formatCurrency(faltaMeta)} para bater a meta
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>{formatCurrency(data.faturamento)}</span>
              <span>{formatCurrency(data.metaFaturamento)}</span>
            </div>
            <Progress 
              value={Math.min((data.faturamento / data.metaFaturamento) * 100, 100)} 
              className={`h-2 ${metaBatida ? 'bg-positive/20' : ''}`}
              indicatorClassName={metaBatida ? 'bg-positive' : 'bg-primary'}
            />
            <div className="flex justify-end text-xs text-muted-foreground">
              {((data.faturamento / data.metaFaturamento) * 100).toFixed(1)}% alcançado
            </div>
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
              <p className="font-display text-lg font-bold text-positive">{data.leadsOrganico}</p>
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
            <Wallet className="h-5 w-5 text-positive" />
            <span className="text-xs text-muted-foreground">Faturamento do Mês</span>
          </div>
          <p className="font-display text-2xl font-bold text-positive">{formatCurrency(data.faturamento)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.totalVendas} venda{data.totalVendas !== 1 ? 's' : ''} realizada{data.totalVendas !== 1 ? 's' : ''}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-warning" />
            <span className="text-xs text-muted-foreground">Investimento em Tráfego</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{formatCurrency(data.custoAnuncio)}</p>
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
            <DollarSign className={`h-5 w-5 ${data.lucroLiquido >= 0 ? 'text-positive' : 'text-negative'}`} />
            <span className="text-xs text-muted-foreground">Lucro Líquido</span>
          </div>
          <p className={`font-display text-2xl font-bold ${data.lucroLiquido >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(data.lucroLiquido)}
          </p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div variants={item} className="metric-card">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Faturamento Mensal — {year}
        </h3>
        <div className="h-64 min-h-[256px] w-full min-w-[200px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={256} minWidth={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="fill-muted-foreground" fontSize={12} />
              <YAxis className="fill-muted-foreground" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              />
              <Bar dataKey="faturamento" fill="hsl(var(--positive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
