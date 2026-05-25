-- Drop the existing function so we can recreate it with new output columns or modified logic if needed,
-- but since we're just adding a property to the JSON object, CREATE OR REPLACE is sufficient.
CREATE OR REPLACE FUNCTION public.fn_get_cadencia_leads_v4(
    p_empresa_id UUID,
    p_lead_ids   UUID[],
    p_hoje       TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH Regras AS (
        SELECT id, tipo_lembrete, cadencia_envio, template_mensagem
        FROM public.regras_automacoes
        WHERE id_empresa = p_empresa_id
    ),
    LeadsServicos AS (
        SELECT
            l.id                AS lead_id,
            l.nome              AS lead_nome,
            l.situacao_do_cliente,
            l.data_contato,
            l.data_orcamento,
            (
                SELECT v.data_servico
                FROM public.vendas v
                WHERE v.id_leads = l.id AND v.data_servico IS NOT NULL
                ORDER BY v.data_servico DESC LIMIT 1
            ) AS data_servico_recente
        FROM public.leads l
        WHERE l.id = ANY(p_lead_ids)
          AND l.id_empresa = p_empresa_id
    ),
    CadenciasCalculadas AS (
        SELECT
            ls.lead_id,
            r.id AS regra_id,
            r.tipo_lembrete,
            r.template_mensagem,
            ls.lead_nome,
            CASE
                WHEN r.tipo_lembrete = 'follow_up_pre_orcamento'  THEN p_hoje::date - ls.data_contato::date
                WHEN r.tipo_lembrete = 'follow_up_pos_orcamento'  THEN p_hoje::date - ls.data_orcamento::date
                WHEN r.tipo_lembrete = 'lembrete_agendamento'     THEN ls.data_servico_recente::date - p_hoje::date
                WHEN r.tipo_lembrete = 'pos_venda'                THEN p_hoje::date - ls.data_servico_recente::date
                ELSE -1
            END AS dias_diferenca,
            r.cadencia_envio
        FROM LeadsServicos ls
        CROSS JOIN Regras r
        WHERE (
            (ls.situacao_do_cliente = 'Agendado'        AND r.tipo_lembrete = 'lembrete_agendamento') OR
            (ls.situacao_do_cliente = 'Fechado'         AND r.tipo_lembrete = 'pos_venda') OR
            (ls.situacao_do_cliente IN ('Reabordar', 'Interesse Futuro')
                AND r.tipo_lembrete IN ('follow_up_pre_orcamento', 'follow_up_pos_orcamento'))
        ) AND NOT EXISTS (
            SELECT 1 FROM public.historico_atendimento ha
            WHERE ha.id_leads = ls.lead_id
              AND ha.tipo = r.tipo_lembrete
              AND ha.data_criacao::date = p_hoje::date
        )
    ),
    MensagensHoje AS (
        SELECT
            lead_id,
            regra_id,
            tipo_lembrete,
            lead_nome,
            template_mensagem,
            dias_diferenca,
            ROW_NUMBER() OVER(PARTITION BY lead_id ORDER BY tipo_lembrete) AS rn
        FROM CadenciasCalculadas
        WHERE dias_diferenca > 0 AND (
            (tipo_lembrete = 'lembrete_agendamento' AND dias_diferenca = cadencia_envio) OR
            (tipo_lembrete != 'lembrete_agendamento' AND CAST(dias_diferenca AS INTEGER) % cadencia_envio = 0)
        )
    )
    SELECT COALESCE(json_object_agg(
        lead_id,
        json_build_object(
            'tipo',     tipo_lembrete,
            'leadId',   lead_id,
            'regra_id', regra_id,
            'label',    CASE
                            WHEN tipo_lembrete = 'follow_up_pre_orcamento'  THEN 'Follow-up Pré-orçamento'
                            WHEN tipo_lembrete = 'follow_up_pos_orcamento'  THEN 'Follow-up Pós-orçamento'
                            WHEN tipo_lembrete = 'lembrete_agendamento'     THEN 'Lembrete de Agendamento'
                            WHEN tipo_lembrete = 'pos_venda'                THEN 'Pós-venda'
                            ELSE tipo_lembrete
                        END,
            'mensagem', COALESCE(
                            REPLACE(REPLACE(template_mensagem, '{nome}', lead_nome), '{dias}', dias_diferenca::text),
                            'Olá ' || lead_nome || '! 👋'
                        )
        )
    ), '{}'::json) INTO v_result
    FROM MensagensHoje
    WHERE rn = 1;

    RETURN v_result;
END;
$$;
