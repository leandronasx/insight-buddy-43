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
        .eq('id_empresa', empresa.id)
        .gte('data_criacao', start)
        .lt('data_criacao', end);

      const leads = leadsData ?? [];
      const leadIds = leads.map(l => l.id);

      // Vendas do mês (via leads da empresa)
      let vendas: any[] = [];
      if (leadIds.length > 0) {
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('id, id_leads, status, data_venda')
          .in('id_leads', leadIds)
          .gte('data_venda', start)
          .lt('data_venda', end);
        vendas = vendasData ?? [];
      }

      // Itens das vendas para calcular faturamento
      let itens: any[] = [];
      if (vendas.length > 0) {
        const { data: itensData } = await supabase
          .from('itens_vendas')
          .select('valor, bonus, id_vendas')
          .in('id_vendas', vendas.map(v => v.id));
        itens = itensData ?? [];
      }

      // Financeiro do mês
      const { data: fin } = await supabase
        .from('financeiro')
        .select('*')
        .eq('id_empresa', empresa.id)
        .eq('mes', month)
        .eq('ano', year)
        .maybeSingle();

      const totalLeads = leads.length;
      const leadsTrafego = leads.filter(l => l.origem_lead === 'Tráfego').length;
      const leadsOrganico = leads.filter(l => l.origem_lead === 'Orgânico').length;
      const leadsIndicacao = leads.filter(l => l.origem_lead === 'Indicação').length;
      const leadsFechados = leads.filter(l => l.situacao_do_cliente === 'Fechado').length;
      const totalVendas = vendas.length;
      const conversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
      const faturamento = itens.reduce((s, i) => s + Number(i.valor ?? 0), 0);
      const custoAnuncio = Number(fin?.custo_anuncio ?? 0);
      const custoOperacional = Number(fin?.custo_operacional ?? 0);
      const metaFaturamento = Number(fin?.meta_financeira ?? 0);
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
        .eq('id_empresa', empresa.id);
      const leadIds = (leadsData ?? []).map(l => l.id);
      if (leadIds.length === 0) return months.map(mes => ({ mes, faturamento: 0 }));

      const { data: vendas } = await supabase
        .from('vendas')
        .select('id, data_venda')
        .in('id_leads', leadIds)
        .gte('data_venda', `${year}-01-01`)
        .lt('data_venda', `${year + 1}-01-01`);

      const vendaIds = (vendas ?? []).map(v => v.id);
      let itens: any[] = [];
      if (vendaIds.length > 0) {
        const { data: itensData } = await supabase
          .from('itens_vendas')
          .select('valor, id_vendas')
          .in('id_vendas', vendaIds);
        itens = itensData ?? [];
      }

      const itensByVenda: Record<string, number> = {};
      itens.forEach(i => {
        itensByVenda[i.id_vendas] = (itensByVenda[i.id_vendas] ?? 0) + Number(i.valor);
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
