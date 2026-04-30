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

      const { data: rpcData, error } = await supabase.rpc('fn_get_dashboard_data', {
        p_empresa_id: empresa.id,
        p_month: month,
        p_year: year,
        p_start: start,
        p_end: end
      });

      if (error) {
        console.error('Error fetching dashboard data via RPC:', error);
        throw error;
      }

      const raw = rpcData as unknown as Record<string, unknown>;
      const faturamento = Number(raw?.faturamento ?? 0);
      const custoAnuncio = Number(raw?.custoAnuncio ?? 0);
      const custoOperacional = Number(raw?.custoOperacional ?? 0);
      const metaFaturamento = Number(raw?.metaFaturamento ?? 0);
      const totalLeads = Number(raw?.totalLeads ?? 0);
      const leadsFechados = Number(raw?.leadsFechados ?? 0);
      const totalVendas = Number(raw?.totalVendas ?? 0);

      const conversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
      const roi = custoAnuncio > 0 ? faturamento / custoAnuncio : 0;
      const cac = totalVendas > 0 ? custoAnuncio / totalVendas : 0;
      const lucroLiquido = faturamento - (custoAnuncio + custoOperacional);
      const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

      return {
        totalLeads,
        leadsTrafego: Number(raw?.leadsTrafego ?? 0),
        leadsOrganico: Number(raw?.leadsOrganico ?? 0),
        leadsIndicacao: Number(raw?.leadsIndicacao ?? 0),
        leadsFechados,
        totalVendas,
        conversao,
        faturamento,
        custoAnuncio,
        custoOperacional,
        metaFaturamento,
        roi,
        cac,
        lucroLiquido,
        ticketMedio,
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
      let itens: unknown[] = [];
      if (vendaIds.length > 0) {
        const { data: itensData } = await supabase
          .from('itens_vendas')
          .select('valor, bonus, id_vendas')
          .in('id_vendas', vendaIds);
        itens = itensData ?? [];
      }

      const itensByVenda: Record<string, number> = {};
      itens.forEach(i => {
        itensByVenda[i.id_vendas] = (itensByVenda[i.id_vendas] ?? 0) + Number(i.valor) - Number(i.bonus ?? 0);
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