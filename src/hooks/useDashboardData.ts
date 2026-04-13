import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useMonth } from '@/contexts/MonthContext';
import { getDateRange } from '@/lib/date-utils';

interface DashboardData {
  totalLeads: number;
  leadsTrafego: number;
  leadsOrganico: number;
  leadsIndicacao: number;
  leadsFechados: number;
  totalVendas: number;
  conversao: number;
  faturamento: number;
  investimentoTrafego: number;
  custoOperacional: number;
  metaFaturamento: number;
  roi: number;
  cac: number;
  lucroLiquido: number;
  ticketMedio: number;
}

function getDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endM = month === 12 ? 1 : month + 1;
  const endY = month === 12 ? year + 1 : year;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;
  return { start, end };
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

      const [leadsRes, vendasRes, finRes] = await Promise.all([
        supabase.from('leads').select('*').eq('empresa_id', empresa.id)
          .gte('data_mensagem', start).lt('data_mensagem', end),
        supabase.from('vendas').select('*, lead_id').eq('empresa_id', empresa.id)
          .gte('data_venda', start).lt('data_venda', end),
        supabase.from('financeiro_mensal').select('*').eq('empresa_id', empresa.id)
          .eq('mes_referencia', month).eq('ano_referencia', year).maybeSingle(),
      ]);

      const leads = leadsRes.data ?? [];
      const vendas = vendasRes.data ?? [];
      const fin = finRes.data;

      // Fetch leads that have vendas but messaged in different month
      const vendaLeadIds = vendas.filter(v => v.lead_id).map(v => v.lead_id as string);
      const existingLeadIds = new Set(leads.map(l => l.id));
      const missingLeadIds = vendaLeadIds.filter(id => !existingLeadIds.has(id));

      let allLeads = leads;
      if (missingLeadIds.length > 0) {
        const { data: extraLeads } = await supabase
          .from('leads').select('*').eq('empresa_id', empresa.id).in('id', missingLeadIds);
        if (extraLeads) allLeads = [...leads, ...extraLeads];
      }

      const totalLeads = allLeads.length;
      const leadsTrafego = allLeads.filter(l => l.origem === 'Tráfego').length;
      const leadsOrganico = allLeads.filter(l => l.origem === 'Orgânico').length;
      const leadsIndicacao = allLeads.filter(l => l.origem === 'Indicação').length;
      const leadsFechados = allLeads.filter(l => l.status === 'Fechado').length;
      const totalVendas = vendas.length;
      const conversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
      const faturamento = vendas.reduce((acc, v) => acc + Number(v.valor_final), 0);
      const investimentoTrafego = Number(fin?.investimento_trafego ?? 0);
      const custoOperacional = Number(fin?.custo_operacional ?? 0);
      const metaFaturamento = Number(fin?.meta_faturamento ?? 0);
      const roi = investimentoTrafego > 0 ? faturamento / investimentoTrafego : 0;
      const cac = totalVendas > 0 ? investimentoTrafego / totalVendas : 0;
      const lucroLiquido = faturamento - (investimentoTrafego + custoOperacional);
      const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

      return {
        totalLeads, leadsTrafego, leadsOrganico, leadsIndicacao,
        leadsFechados, totalVendas, conversao, faturamento, investimentoTrafego,
        custoOperacional, metaFaturamento, roi, cac, lucroLiquido, ticketMedio,
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
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const { data: allVendas } = await supabase
        .from('vendas')
        .select('valor_final, data_venda')
        .eq('empresa_id', empresa.id)
        .gte('data_venda', `${year}-01-01`)
        .lt('data_venda', `${year + 1}-01-01`);

      return months.map((mes, i) => {
        const monthVendas = allVendas?.filter(v => new Date(v.data_venda).getMonth() === i) ?? [];
        return { mes, faturamento: monthVendas.reduce((acc, v) => acc + Number(v.valor_final), 0) };
      });
    },
    enabled: !!empresa,
  });
}
