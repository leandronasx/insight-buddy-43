import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, TrendingUp, Wallet, Receipt, Tag, DollarSign, BarChart3 } from 'lucide-react';
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
    const fetchAll = async () => {
      setLoading(true);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      // Fetch active empresas
      const { data: allEmpresas } = await supabase
        .from('empresas')
        .select('*')
        .eq('status', 'ativo')
        .neq('user_id', user?.id ?? '')
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
          .gte('data_mensagem', startDate).lt('data_mensagem', endDate),
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

        const faturamento = empVendas.reduce((acc, v) => acc + Number(v.valor_final), 0);
        const investimentoTrafego = Number(empFin?.investimento_trafego ?? 0);
        const totalLeads = empLeads.length;
        const leadsFechados = empLeads.filter(l => l.status === 'Fechado').length;
        const totalVendas = empVendas.length;
        const cac = leadsFechados > 0 ? investimentoTrafego / leadsFechados : 0;
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

      const empresasComFat = metrics.filter(m => m.faturamento > 0);
      const empresasComCac = metrics.filter(m => m.cac > 0);
      const empresasComTicket = metrics.filter(m => m.ticketMedio > 0);
      const empresasComInv = metrics.filter(m => m.investimentoTrafego > 0);

      setEmpresas(metrics);
      setTotals({
        empresasAtivas,
        faturamentoTotal,
        investimentoTotal,
        leadsTotal,
        leadsFechadosTotal,
        mediaFaturamento: empresasComFat.length > 0 ? faturamentoTotal / empresasComFat.length : 0,
        mediaCac: empresasComCac.length > 0 ? empresasComCac.reduce((a, m) => a + m.cac, 0) / empresasComCac.length : 0,
        mediaInvestimento: empresasComInv.length > 0 ? investimentoTotal / empresasComInv.length : 0,
        mediaTicketMedio: empresasComTicket.length > 0 ? empresasComTicket.reduce((a, m) => a + m.ticketMedio, 0) / empresasComTicket.length : 0,
      });
      setLoading(false);
    };

    fetchAll();
  }, [month, year]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  if (loading) {
    return <p className="text-muted-foreground animate-pulse text-center py-8">Carregando painel...</p>;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Empresas Ativas</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totals.empresasAtivas}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Faturamento Total</span>
          </div>
          <p className="font-display text-xl font-bold text-primary">{fmt(totals.faturamentoTotal)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-destructive" />
            <span className="text-xs text-muted-foreground">Total em Tráfego</span>
          </div>
          <p className="font-display text-xl font-bold text-destructive">{fmt(totals.investimentoTotal)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-info" />
            <span className="text-xs text-muted-foreground">Total Leads</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{totals.leadsTotal}</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.leadsFechadosTotal} fechado{totals.leadsFechadosTotal !== 1 ? 's' : ''}</p>
        </motion.div>
      </div>

      {/* Averages */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Média Faturamento</span>
          </div>
          <p className="font-display text-lg font-bold text-foreground">{fmt(totals.mediaFaturamento)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-warning" />
            <span className="text-xs text-muted-foreground">Média CAC</span>
          </div>
          <p className="font-display text-lg font-bold text-foreground">{fmt(totals.mediaCac)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-5 w-5 text-info" />
            <span className="text-xs text-muted-foreground">Média Investimento</span>
          </div>
          <p className="font-display text-lg font-bold text-foreground">{fmt(totals.mediaInvestimento)}</p>
        </motion.div>

        <motion.div variants={item} className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-primary" />
            <span className="text-xs text-muted-foreground">Média Ticket Médio</span>
          </div>
          <p className="font-display text-lg font-bold text-foreground">{fmt(totals.mediaTicketMedio)}</p>
        </motion.div>
      </div>

      {/* Per-empresa table */}
      <motion.div variants={item} className="metric-card overflow-hidden">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Detalhamento por Empresa</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted-foreground">Empresa</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Faturamento</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Tráfego</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Leads</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Fechados</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">CAC</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(emp => (
                <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3">
                    <p className="font-medium text-foreground">{emp.empresa_nome}</p>
                    {emp.nome_dono && <p className="text-xs text-muted-foreground">{emp.nome_dono}</p>}
                  </td>
                  <td className="py-3 text-right font-medium text-primary">{fmt(emp.faturamento)}</td>
                  <td className="py-3 text-right text-destructive">{fmt(emp.investimentoTrafego)}</td>
                  <td className="py-3 text-right text-foreground">{emp.totalLeads}</td>
                  <td className="py-3 text-right text-foreground">{emp.leadsFechados}</td>
                  <td className="py-3 text-right text-foreground">{fmt(emp.cac)}</td>
                  <td className="py-3 text-right text-foreground">{fmt(emp.ticketMedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {empresas.length === 0 && (
          <p className="text-muted-foreground text-center py-6">Nenhuma empresa ativa encontrada.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
