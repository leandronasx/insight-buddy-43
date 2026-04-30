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

      const { data: metricsData, error } = await supabase.rpc('get_dashboard_metrics', {
        p_empresa_id: empresa.id,
        p_start: start,
        p_end: end
      });

      if (error) throw error;

      const metrics = metricsData as any;

      return {
        totalLeads: Number(metrics.totalLeads ?? 0),
        leadsTrafego: Number(metrics.leadsTrafego ?? 0),
        leadsOrganico: Number(metrics.leadsOrganico ?? 0),
        leadsIndicacao: Number(metrics.leadsIndicacao ?? 0),
        leadsFechados: Number(metrics.leadsFechados ?? 0),
        totalVendas: Number(metrics.totalVendas ?? 0),
        conversao: Number(metrics.conversao ?? 0),
        faturamento: Number(metrics.faturamento ?? 0),
        custoAnuncio: Number(metrics.custoAnuncio ?? 0),
        custoOperacional: Number(metrics.custoOperacional ?? 0),
        metaFaturamento: Number(metrics.metaFaturamento ?? 0),
        roi: Number(metrics.roi ?? 0),
        cac: Number(metrics.cac ?? 0),
        lucroLiquido: Number(metrics.lucroLiquido ?? 0),
        ticketMedio: Number(metrics.ticketMedio ?? 0),
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