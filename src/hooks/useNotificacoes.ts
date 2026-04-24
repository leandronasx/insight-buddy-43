import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';

export interface LeadSemContato {
  id: string;
  nome: string;
  telefone: string | null;
  situacao_do_cliente: string | null;
  data_atualizacao: string;
  diasSemContato: number;
}

export interface NotificacoesData {
  leadsSemContato3dias: LeadSemContato[];
  leadsSemContato7dias: LeadSemContato[];
  agendadosHoje: number;
  agendadosAmanha: number;
  totalAlertas: number;
}

function diffDias(dateStr: string): number {
  const now = new Date();
  const past = new Date(dateStr);
  return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

function isDateDay(dateStr: string | null, targetDate: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

export function useNotificacoes() {
  const { empresa } = useEmpresa();

  return useQuery<NotificacoesData>({
    queryKey: ['notificacoes', empresa?.id],
    queryFn: async (): Promise<NotificacoesData> => {
      if (!empresa) return { leadsSemContato3dias: [], leadsSemContato7dias: [], agendadosHoje: 0, agendadosAmanha: 0, totalAlertas: 0 };

      const since = new Date();
      since.setDate(since.getDate() - 60);

      // Leads ativos sem estar fechados/sem interesse
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, nome, telefone, situacao_do_cliente, data_atualizacao')
        .eq('id_empresa', empresa.id)
        .not('situacao_do_cliente', 'in', '("Sem Interesse","Fechado")')
        .gte('data_atualizacao', since.toISOString())
        .order('data_atualizacao', { ascending: true });

      const leads = leadsData ?? [];
      const leadIds = leads.map(l => l.id);

      // Agendamentos de hoje e amanhã via vendas
      let vendas: any[] = [];
      if (leadIds.length > 0) {
        const { data: vendasData } = await supabase
          .from('vendas')
          .select('data_servico')
          .in('id_leads', leadIds)
          .not('data_servico', 'is', null);
        vendas = vendasData ?? [];
      }

      const hoje = new Date();
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);

      const semContato: LeadSemContato[] = leads.map(l => ({
        ...l,
        diasSemContato: diffDias(l.data_atualizacao),
      }));

      const leadsSemContato3dias = semContato.filter(l => l.diasSemContato >= 3 && l.diasSemContato < 7);
      const leadsSemContato7dias = semContato.filter(l => l.diasSemContato >= 7);
      const agendadosHoje = vendas.filter(v => isDateDay(v.data_servico, hoje)).length;
      const agendadosAmanha = vendas.filter(v => isDateDay(v.data_servico, amanha)).length;

      const totalAlertas =
        leadsSemContato7dias.length +
        Math.ceil(leadsSemContato3dias.length / 2) +
        (agendadosHoje > 0 ? 1 : 0) +
        (agendadosAmanha > 0 ? 1 : 0);

      return { leadsSemContato3dias, leadsSemContato7dias, agendadosHoje, agendadosAmanha, totalAlertas };
    },
    enabled: !!empresa,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}
