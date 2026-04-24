import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';

export interface DashboardData {
  totalLeads: number;
  leadsTrafego: number;
  leadsOrganico: number;
  leadsIndicacao: number;
  leadsFechados: number;
  totalVendas: number;
  conversao: number;
  faturamento: number;
  custoAnuncio: number;
  custoOperacional: number;
  metaFaturamento: number;
  roi: number;
  cac: number;
  lucroLiquido: number;
  ticketMedio: number;
}

export function useDashboardData() {
  const { empresa } = useEmpresa();
  const { month, year } = useMonth();

  const queryKey = ['dashboard', empresa?.id, month, year];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<DashboardData> => {
      if (!empresa) throw new Error('No empresa');
      const { start, end } = getDateRange(month, year);

      // Leads criados no mês
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('created_at', start)
        .lt('created_at', end);

      const leads = leadsData ?? [];
      const leadIds = leads.map(l => l.id);

      // Vendas do mês (via leads da empresa)
      let vendas: any[] = [];
      if (leadIds.length > 0) {
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('id, lead_id, data_venda')
          .in('lead_id', leadIds)
          .gte('data_venda', start)
          .lt('data_venda', end);
        vendas = vendasData ?? [];
      }

      // Itens das vendas para calcular faturamento
      let itens: any[] = [];
      if (vendas.length > 0) {
        const { data: itensData } = await supabase
          .from('servicos')
          .select('valor, bonus, venda_id')
          .in('venda_id', vendas.map(v => v.id));
        itens = itensData ?? [];
      }

      // Financeiro do mês
      const { data: fin } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('empresa_id', empresa.id)
        .eq('mes_referencia', month)
        .eq('ano_referencia', year)
        .maybeSingle();

      const totalLeads = leads.length;
      const leadsTrafego = leads.filter(l => l.origem === 'Tráfego').length;
      const leadsOrganico = leads.filter(l => l.origem === 'Orgânico').length;
      const leadsIndicacao = leads.filter(l => l.origem === 'Indicação').length;
      const leadsFechados = leads.filter(l => l.status === 'Fechado').length;
      const totalVendas = vendas.length;
      const conversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
      const faturamento = itens.reduce((s, i) => s + Number(i.valor ?? 0), 0);
      const custoAnuncio = Number(fin?.investimento_trafego ?? 0);
      const custoOperacional = Number(fin?.custo_operacional ?? 0);
      const metaFaturamento = Number(fin?.meta_faturamento ?? 0);
      const roi = custoAnuncio > 0 ? faturamento / custoAnuncio : 0;
      const cac = totalVendas > 0 ? custoAnuncio / totalVendas : 0;
      const lucroLiquido = faturamento - (custoAnuncio + custoOperacional);
      const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

      return {
        totalLeads, leadsTrafego, leadsOrganico, leadsIndicacao,
        leadsFechados, totalVendas, conversao, faturamento,
        custoAnuncio, custoOperacional, metaFaturamento,
        roi, cac, lucroLiquido, ticketMedio,
      };
    },
    enabled: !!empresa,
  });

  return { data: data ?? null, isLoading };
}

export function useChartData() {
  const { empresa } = useEmpresa();
  const { year } = useMonth();

  return useQuery({
    queryKey: ['dashboard-chart', empresa?.id, year],
    queryFn: async () => {
      if (!empresa) throw new Error('No empresa');
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

      // Leads da empresa para filtrar vendas
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id')
        .eq('empresa_id', empresa.id);
      const leadIds = (leadsData ?? []).map(l => l.id);
      if (leadIds.length === 0) return months.map(mes => ({ mes, faturamento: 0 }));

      const { data: vendas } = await supabase
        .from('vendas')
        .select('id, data_venda')
        .in('lead_id', leadIds)
        .gte('data_venda', `${year}-01-01`)
        .lt('data_venda', `${year + 1}-01-01`);

      const vendaIds = (vendas ?? []).map(v => v.id);
      let itens: any[] = [];
      if (vendaIds.length > 0) {
        const { data: itensData } = await supabase
          .from('servicos')
          .select('valor, venda_id')
          .in('venda_id', vendaIds);
        itens = itensData ?? [];
      }

      const itensByVenda: Record<string, number> = {};
      itens.forEach(i => {
        itensByVenda[i.venda_id] = (itensByVenda[i.venda_id] ?? 0) + Number(i.valor);
      });

      return months.map((mes, i) => {
        const monthVendas = (vendas ?? []).filter(v =>
          new Date(`${v.data_venda}T00:00:00`).getMonth() === i
        );
        const fat = monthVendas.reduce((s, v) => s + (itensByVenda[v.id] ?? 0), 0);
        return { mes, faturamento: fat };
      });
    },
    enabled: !!empresa,
  });
}
