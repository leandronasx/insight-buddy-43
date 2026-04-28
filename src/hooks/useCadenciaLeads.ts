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

      // 1. Busca todas as regras da empresa
      const { data: regrasData } = await supabase
        .from('regras_automacoes')
        .select('id, tipo_lembrete, cadencia_envio, template_mensagem')
        .eq('id_empresa', empresa.id);

      const regras: Regra[] = regrasData ?? [];
      if (regras.length === 0) {
        leads.forEach(l => result.set(l.id, null));
        return result;
      }

      // 2. Busca data_servico das vendas (para lembrete_agendamento e pos_venda)
      const leadIds = leads.map(l => l.id);
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('id_leads, data_servico')
        .in('id_leads', leadIds)
        .not('data_servico', 'is', null)
        .order('data_servico', { ascending: false });

      // Pega a data_servico mais recente por lead
      const dataServicoPorLead: Record<string, string> = {};
      (vendasData ?? []).forEach((v: any) => {
        if (!dataServicoPorLead[v.id_leads]) {
          dataServicoPorLead[v.id_leads] = v.data_servico;
        }
      });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // 3. Para cada lead, verifica se hoje é dia de enviar
      for (const lead of leads) {
        const situacao = lead.situacao_do_cliente ?? '';
        const tiposRelevantes = SITUACAO_TIPOS[situacao] ?? [];

        if (tiposRelevantes.length === 0) {
          result.set(lead.id, null);
          continue;
        }

        let mensagemParaHoje: CadenciaMensagem | null = null;

        for (const tipo of tiposRelevantes) {
          const regra = regras.find(r => r.tipo_lembrete === tipo);
          if (!regra) continue;

          let dataRef: Date | null = null;

          if (tipo === 'follow_up_pre_orcamento' && lead.data_contato) {
            dataRef = new Date(lead.data_contato);
            dataRef.setHours(0, 0, 0, 0);
            const diasApos = diffDias(dataRef, hoje);
            // Ativo se hoje é exatamente o dia da cadência ou múltiplo dela
            if (diasApos > 0 && diasApos % regra.cadencia_envio === 0) {
              mensagemParaHoje = {
                mensagem: renderTemplate(regra.template_mensagem, lead.nome),
                tipo,
                label: TIPO_LABELS[tipo],
                leadId: lead.id,
              };
              break;
            }
          }

          if (tipo === 'follow_up_pos_orcamento' && lead.data_orcamento) {
            dataRef = new Date(lead.data_orcamento);
            dataRef.setHours(0, 0, 0, 0);
            const diasApos = diffDias(dataRef, hoje);
            if (diasApos > 0 && diasApos % regra.cadencia_envio === 0) {
              mensagemParaHoje = {
                mensagem: renderTemplate(regra.template_mensagem, lead.nome),
                tipo,
                label: TIPO_LABELS[tipo],
                leadId: lead.id,
              };
              break;
            }
          }

          if (tipo === 'lembrete_agendamento' && dataServicoPorLead[lead.id]) {
            const dataServico = new Date(dataServicoPorLead[lead.id] + 'T00:00:00');
            dataServico.setHours(0, 0, 0, 0);
            // Dias ANTES do serviço
            const diasAntes = diffDias(hoje, dataServico);
            if (diasAntes > 0 && diasAntes === regra.cadencia_envio) {
              mensagemParaHoje = {
                mensagem: renderTemplate(regra.template_mensagem, lead.nome),
                tipo,
                label: TIPO_LABELS[tipo],
                leadId: lead.id,
              };
              break;
            }
          }

          if (tipo === 'pos_venda' && dataServicoPorLead[lead.id]) {
            const dataServico = new Date(dataServicoPorLead[lead.id] + 'T00:00:00');
            dataServico.setHours(0, 0, 0, 0);
            const diasApos = diffDias(dataServico, hoje);
            if (diasApos > 0 && diasApos % regra.cadencia_envio === 0) {
              mensagemParaHoje = {
                mensagem: renderTemplate(regra.template_mensagem, lead.nome),
                tipo,
                label: TIPO_LABELS[tipo],
                leadId: lead.id,
              };
              break;
            }
          }
        }

        result.set(lead.id, mensagemParaHoje);
      }

      return result;
    },
    enabled: !!empresa && leads.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // revalida a cada 10 min
  });
}
