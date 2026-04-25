import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Wallet, Receipt, Tag, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMonth } from '@/contexts/MonthContext';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/date-utils';

interface EmpresaMetrics {
  id: string;
  nome_empresa: string;
  nome_dono: string | null;
  faturamento: number;
  custoAnuncio: number;
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
    const fetch = async () => {
      setLoading(true);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      // Com a nova RLS, admin vê TODAS as empresas.
      // Excluímos a própria empresa do admin (GTL) — ela é a conta de gestão, não cliente.
      const { data: allEmpresas, error } = await supabase
        .from('empresas')
        .select('*')
        .neq('id_usuario', user.id)
        .order('nome_empresa');

      if (error) {
        console.error('Erro ao buscar empresas (verifique a migration RLS):', error.message);
        setLoading(false);
        return;
      }

      if (!allEmpresas || allEmpresas.length === 0) {
        setEmpresas([]);
        setTotals({
          empresasAtivas: 0, faturamentoTotal: 0, investimentoTotal: 0,
          leadsTotal: 0, leadsFechadosTotal: 0, mediaFaturamento: 0,
          mediaCac: 0, mediaInvestimento: 0, mediaTicketMedio: 0,
        });
        setLoading(false);
        return;
      }

      const empresaIds = allEmpresas.map(e => e.id);

      // Busca leads de todas as empresas no mês
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, id_empresa, situacao_do_cliente, origem_lead, data_criacao')
        .in('id_empresa', empresaIds)
        .gte('data_criacao', startDate)
        .lt('data_criacao', endDate);

      const leads = leadsData ?? [];

      // Todos os leads (sem filtro de data) para obter IDs para buscar vendas
      const { data: todosLeadsData } = await supabase
        .from('leads')
        .select('id, id_empresa')
        .in('id_empresa', empresaIds);

      const todosLeads = todosLeadsData ?? [];
      const todosLeadIds = todosLeads.map(l => l.id);
      const leadEmpresaMap: Record<string, string> = {};
      todosLeads.forEach(l => { leadEmpresaMap[l.id] = l.id_empresa; });

      // Busca vendas via lead IDs no mês
      let vendas: any[] = [];
      if (todosLeadIds.length > 0) {
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('id, id_leads, data_venda, status')
          .in('id_leads', todosLeadIds)
          .gte('data_venda', startDate)
          .lt('data_venda', endDate);
        vendas = vendasData ?? [];
      }

      // Busca itens_vendas para calcular faturamento
      let itensMap: Record<string, number> = {};
      if (vendas.length > 0) {
        const { data: itensData } = await supabase
          .from('itens_vendas')
          .select('id_vendas, valor')
          .in('id_vendas', vendas.map(v => v.id));
        (itensData ?? []).forEach((i: any) => {
          itensMap[i.id_vendas] = (itensMap[i.id_vendas] ?? 0) + Number(i.valor);
        });
      }

      // Busca financeiro do mês
      const { data: finsData } = await supabase
        .from('financeiro')
        .select('id_empresa, custo_anuncio, meta_financeira')
        .in('id_empresa', empresaIds)
        .eq('mes', month)
        .eq('ano', year);
      const fins = finsData ?? [];

      // Calcula métricas por empresa
      const metrics: EmpresaMetrics[] = allEmpresas.map(emp => {
        const empLeads = leads.filter(l => l.id_empresa === emp.id);
        const empVendas = vendas.filter(v => leadEmpresaMap[v.id_leads] === emp.id);
        const empFin = fins.find(f => f.id_empresa === emp.id);

        const faturamento = empVendas.reduce((s, v) => s + (itensMap[v.id] ?? 0), 0);
        const custoAnuncio = Number(empFin?.custo_anuncio ?? 0);
        const totalLeads = empLeads.length;
        const leadsFechados = empLeads.filter(l => l.situacao_do_cliente === 'Fechado').length;
        const totalVendas = empVendas.length;
        const cac = totalVendas > 0 ? custoAnuncio / totalVendas : 0;
        const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

        return {
          id: emp.id,
          nome_empresa: emp.nome_empresa,
          nome_dono: emp.nome_dono,
          faturamento, custoAnuncio, totalLeads, leadsFechados,
          totalVendas, cac, ticketMedio,
        };
      });

      // Totais agregados
      const n = metrics.length || 1;
      const t: Totals = {
        empresasAtivas: metrics.length,
        faturamentoTotal: metrics.reduce((s, m) => s + m.faturamento, 0),
        investimentoTotal: metrics.reduce((s, m) => s + m.custoAnuncio, 0),
        leadsTotal: metrics.reduce((s, m) => s + m.totalLeads, 0),
        leadsFechadosTotal: metrics.reduce((s, m) => s + m.leadsFechados, 0),
        mediaFaturamento: metrics.reduce((s, m) => s + m.faturamento, 0) / n,
        mediaCac: metrics.reduce((s, m) => s + m.cac, 0) / n,
        mediaInvestimento: metrics.reduce((s, m) => s + m.custoAnuncio, 0) / n,
        mediaTicketMedio: metrics.reduce((s, m) => s + m.ticketMedio, 0) / n,
      };

      setEmpresas(metrics);
      setTotals(t);
      setLoading(false);
    };

    fetch();
  }, [user?.id, month, year]);

  const cards = [
    { label: 'Empresas Ativas', value: totals.empresasAtivas, icon: Building2, fmt: 'num', color: 'text-info' },
    { label: 'Faturamento Total', value: totals.faturamentoTotal, icon: Wallet, fmt: 'cur', color: 'text-positive' },
    { label: 'Total em Tráfego', value: totals.investimentoTotal, icon: DollarSign, fmt: 'cur', color: 'text-destructive' },
    { label: 'Total Leads', value: totals.leadsTotal, icon: Users, fmt: 'num', color: 'text-info', sub: `${totals.leadsFechadosTotal} fechados` },
    { label: 'Média Faturamento', value: totals.mediaFaturamento, icon: Wallet, fmt: 'cur', color: 'text-foreground' },
    { label: 'Média CAC', value: totals.mediaCac, icon: Tag, fmt: 'cur', color: 'text-warning' },
    { label: 'Média Investimento', value: totals.mediaInvestimento, icon: DollarSign, fmt: 'cur', color: 'text-foreground' },
    { label: 'Média Ticket Médio', value: totals.mediaTicketMedio, icon: Receipt, fmt: 'cur', color: 'text-foreground' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(0, 4).map(c => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`font-display text-2xl font-bold ${c.color}`}>
              {loading ? '—' : c.fmt === 'cur' ? formatCurrency(c.value) : c.value}
            </p>
            {c.sub && <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>}
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(4).map(c => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="metric-card">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`font-display text-2xl font-bold ${c.color}`}>
              {loading ? '—' : c.fmt === 'cur' ? formatCurrency(c.value) : c.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Per-empresa table */}
      <div className="metric-card overflow-x-auto">
        <h3 className="font-display font-semibold text-foreground mb-4">Detalhamento por Empresa</h3>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-secondary animate-pulse rounded" />)}
          </div>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-muted-foreground font-medium">Empresa</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">Faturamento</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">Tráfego</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">Leads</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">Fechados</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">CAC</th>
                <th className="pb-2 text-muted-foreground font-medium text-right">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                    {loading ? 'Carregando...' : 'Nenhuma empresa ativa encontrada.'}
                  </td>
                </tr>
              ) : (
                empresas.map(emp => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3">
                      <p className="font-medium text-foreground">{emp.nome_empresa}</p>
                      {emp.nome_dono && <p className="text-xs text-muted-foreground">{emp.nome_dono}</p>}
                    </td>
                    <td className="py-3 text-right text-positive font-medium">{formatCurrency(emp.faturamento)}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatCurrency(emp.custoAnuncio)}</td>
                    <td className="py-3 text-right text-foreground">{emp.totalLeads}</td>
                    <td className="py-3 text-right text-foreground">{emp.leadsFechados}</td>
                    <td className="py-3 text-right text-warning">{formatCurrency(emp.cac)}</td>
                    <td className="py-3 text-right text-foreground">{formatCurrency(emp.ticketMedio)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
