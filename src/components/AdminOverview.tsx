import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Wallet, Receipt, Tag, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import { useAuth } from '@/hooks/useAuth';

interface EmpresaMetrics {
  id: string;
  empresa_nome: string;
  nome_dono: string | null;
  faturamento: number;
  investimentoTrafego: number;
  totalLeads: number;
  leadsFechados: number;
  totalVendas: number;
  cac: number;
  ticketMedio: number;
}

interface Totals {
  empresasAtivas: number;
  faturamentoTotal: number;
  investimentoTotal: number;
  leadsTotal: number;
  leadsFechadosTotal: number;
  mediaFaturamento: number;
  mediaCac: number;
  mediaInvestimento: number;
  mediaTicketMedio: number;
}

export function AdminOverview() {
  const { user } = useAuth();
  const { month, year } = useMonth();
  const [empresas, setEmpresas] = useState<EmpresaMetrics[]>([]);
  const [totals, setTotals] = useState<Totals>({
    empresasAtivas: 0, faturamentoTotal: 0, investimentoTotal: 0,
    leadsTotal: 0, leadsFechadosTotal: 0, mediaFaturamento: 0,
    mediaCac: 0, mediaInvestimento: 0, mediaTicketMedio: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchAll = async () => {
      setLoading(true);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      // Fetch active empresas (excluding admin's own)
      const { data: allEmpresas } = await supabase
        .from('empresas')
        .select('*')
        .neq('user_id', user.id)
        .order('empresa_nome');

      if (!allEmpresas || allEmpresas.length === 0) {
        setEmpresas([]);
        setLoading(false);
        return;
      }

      const empresaIds = allEmpresas.map(e => e.id);

      // Fetch all leads, vendas, financeiro for this month in parallel
      const [leadsRes, vendasRes, finRes] = await Promise.all([
        supabase.from('leads').select('*').in('empresa_id', empresaIds)
          .gte('created_at', startDate).lt('created_at', endDate),
        // In the new schema vendas HAS empresa_id
        supabase.from('vendas').select('*').in('empresa_id', empresaIds)
          .gte('data_venda', startDate).lt('data_venda', endDate),
        supabase.from('financeiro_mensal').select('*').in('empresa_id', empresaIds)
          .eq('mes_referencia', month).eq('ano_referencia', year),
      ]);

      const leads = leadsRes.data ?? [];
      const vendas = vendasRes.data ?? [];
      const fins = finRes.data ?? [];

      const metrics: EmpresaMetrics[] = allEmpresas.map(emp => {
        const empLeads = leads.filter(l => l.empresa_id === emp.id);
        const empVendas = vendas.filter(v => v.empresa_id === emp.id);
        const empFin = fins.find(f => f.empresa_id === emp.id);

        const faturamento = empVendas.reduce((acc: number, v: any) => acc + Number(v.valor_final), 0);
        const investimentoTrafego = Number(empFin?.investimento_trafego ?? 0);
        const totalLeads = empLeads.length;
        const leadsFechados = empLeads.filter(l => l.status === 'Fechado').length;
        const totalVendas = empVendas.length;
        const cac = totalVendas > 0 ? investimentoTrafego / totalVendas : 0;
        const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

        return {
          id: emp.id,
          empresa_nome: emp.empresa_nome,
          nome_dono: emp.nome_dono,
          faturamento,
          investimentoTrafego,
          totalLeads,
          leadsFechados,
          totalVendas,
          cac,
          ticketMedio,
        };
      });

      const empresasAtivas = metrics.length;
      const faturamentoTotal = metrics.reduce((a, m) => a + m.faturamento, 0);
      const investimentoTotal = metrics.reduce((a, m) => a + m.investimentoTrafego, 0);
      const leadsTotal = metrics.reduce((a, m) => a + m.totalLeads, 0);
      const leadsFechadosTotal = metrics.reduce((a, m) => a + m.leadsFechados, 0);

      setTotals({
        empresasAtivas,
        faturamentoTotal,
        investimentoTotal,
        leadsTotal,
        leadsFechadosTotal,
        mediaFaturamento: empresasAtivas ? faturamentoTotal / empresasAtivas : 0,
        mediaInvestimento: empresasAtivas ? investimentoTotal / empresasAtivas : 0,
        mediaTicketMedio: empresasAtivas ? metrics.reduce((a, m) => a + m.ticketMedio, 0) / empresasAtivas : 0,
        mediaCac: empresasAtivas ? metrics.reduce((a, m) => a + m.cac, 0) / empresasAtivas : 0,
      });

      setEmpresas(metrics.sort((a, b) => b.faturamento - a.faturamento));
      setLoading(false);
    };

    fetchAll();
  }, [user?.id, month, year]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const formatMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6 fade-in">
      {/* Resumo Global */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Empresas Ativas</p>
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground">{totals.empresasAtivas}</h3>
        </div>

        <div className="metric-card bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Faturamento Global</p>
          </div>
          <h3 className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totals.faturamentoTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-1">Média: {formatMoney(totals.mediaFaturamento)}/empresa</p>
        </div>

        <div className="metric-card bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Leads Totais</p>
          </div>
          <h3 className="text-2xl font-display font-bold text-blue-600 dark:text-blue-400">{totals.leadsTotal}</h3>
          <p className="text-xs text-muted-foreground mt-1">{totals.leadsFechadosTotal} fechados</p>
        </div>

        <div className="metric-card bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Investimento Global</p>
          </div>
          <h3 className="text-2xl font-display font-bold text-orange-600 dark:text-orange-400">{formatMoney(totals.investimentoTotal)}</h3>
          <p className="text-xs text-muted-foreground mt-1">Média: {formatMoney(totals.mediaInvestimento)}/empresa</p>
        </div>
      </div>

      {/* Lista de Empresas com Metricas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/30">
          <h3 className="font-display font-bold text-lg text-foreground">Desempenho por Empresa</h3>
        </div>

        <div className="divide-y divide-border">
          {empresas.map((emp) => (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={emp.id}
              className="p-5 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between">

                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    <p className="font-medium text-foreground">{emp.empresa_nome}</p>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">{emp.nome_dono || 'Sem responsável'}</p>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3"/> Faturamento</p>
                    <p className="font-bold text-emerald-500">{formatMoney(emp.faturamento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> Vendas/Leads</p>
                    <p className="font-bold text-foreground">{emp.totalVendas} <span className="text-muted-foreground font-normal text-xs">/ {emp.totalLeads}</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3"/> Ticket Médio</p>
                    <p className="font-bold text-blue-500">{formatMoney(emp.ticketMedio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3 w-3"/> CAC</p>
                    <p className="font-bold text-orange-500">{formatMoney(emp.cac)}</p>
                  </div>
                </div>

              </div>
            </motion.div>
          ))}

          {empresas.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma métrica encontrada para este mês.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
