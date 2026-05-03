/**
 * useCadenciaLeads
 * 
 * Para cada lead, verifica se HOJE é dia de enviar alguma mensagem
 * baseado nas regras de cadência criadas na página "Regras de Cadência".
 *
 * Mapeamento tipo → data de referência do lead:
 *  follow_up_pre_orcamento  → data_contato   (dias APÓS)
 *  follow_up_pos_orcamento  → data_orcamento  (dias APÓS)
 *  lembrete_agendamento     → data_servico    (dias ANTES — buscado nas vendas)
 *  pos_venda                → data_servico    (dias APÓS — buscado nas vendas)
 *
 * Retorna: Map<leadId, { mensagem, tipo, label } | null>
 *   null  = nenhuma mensagem para enviar hoje → botão desativado
 *   obj   = mensagem pronta para o dia de hoje → botão ativo
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import type { Lead } from './useLeads';

export interface CadenciaMensagem {
  mensagem: string;
  tipo: string;
  label: string;
  leadId: string;
}

const TIPO_LABELS: Record<string, string> = {
  follow_up_pre_orcamento: 'Follow-up Pré-orçamento',
  follow_up_pos_orcamento: 'Follow-up Pós-orçamento',
  lembrete_agendamento:    'Lembrete de Agendamento',
  pos_venda:               'Pós-venda',
};

// Mapeamento: situação do cliente → tipos de regra relevantes
const SITUACAO_TIPOS: Record<string, string[]> = {
  'Agendado':        ['lembrete_agendamento'],
  'Fechado':         ['pos_venda'],
  'Reabordar':       ['follow_up_pre_orcamento', 'follow_up_pos_orcamento'],
  'Interesse Futuro':['follow_up_pre_orcamento', 'follow_up_pos_orcamento'],
  'Sem Interesse':   [],
};

function diffDias(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function renderTemplate(template: string | null, nome: string): string {
  if (!template) return `Olá ${nome}! 👋`;
  return template.replace(/\{nome\}/g, nome).replace(/\{dias\}/g, '1');
}

interface Regra {
  id: string;
  tipo_lembrete: string;
  cadencia_envio: number;
  template_mensagem: string | null;
}

export function useCadenciaLeads(leads: Lead[]) {
  const { empresa } = useEmpresa();

  return useQuery<Map<string, CadenciaMensagem | null>>({
    queryKey: ['cadencia-leads', empresa?.id, leads.map(l => l.id).join(',')],
    queryFn: async () => {
      const result = new Map<string, CadenciaMensagem | null>();
      if (!empresa || leads.length === 0) return result;

      const leadIds = leads.map(l => l.id);

      const d = new Date();
      const hojeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase.rpc('fn_get_cadencia_leads_v3', {
        p_empresa_id: empresa.id,
        p_lead_ids: leadIds,
        p_hoje: hojeStr
      });

      if (error) {
        console.error('Error fetching cadencias:', error);
        throw error;
      }

      const cadencias = (data as Record<string, CadenciaMensagem>) || {};

      for (const lead of leads) {
        result.set(lead.id, cadencias[lead.id] || null);
      }

      return result;
    },
    enabled: !!empresa && leads.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // revalida a cada 10 min
  });
}
