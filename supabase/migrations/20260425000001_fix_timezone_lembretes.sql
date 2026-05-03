-- ------------------------------------------------------------
-- Fix Timezone issue for Lembretes and Cadencias
-- Creating _v2 functions that accept p_hoje TEXT from frontend
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gerar_lembretes_automacoes_v2(
    p_id_empresa UUID,
    p_hoje TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa RECORD;
    v_hoje    DATE := p_hoje::DATE;
BEGIN
    FOR v_empresa IN
        SELECT id FROM public.empresas
        WHERE (p_id_empresa IS NULL OR id = p_id_empresa)
    LOOP
        WITH regras AS (
            SELECT tipo_lembrete, cadencia_envio, template_mensagem
            FROM public.regras_automacoes
            WHERE id_empresa = v_empresa.id
        ),
        leads_calc AS (
            SELECT
                l.id AS lead_id,
                l.situacao_do_cliente,
                l.data_contato::DATE AS data_contato,
                l.data_orcamento::DATE AS data_orcamento,
                (
                    SELECT v.data_servico
                    FROM public.vendas v
                    WHERE v.id_leads = l.id AND v.data_servico IS NOT NULL
                    ORDER BY v.data_servico DESC
                    LIMIT 1
                ) AS data_servico
            FROM public.leads l
            WHERE l.id_empresa = v_empresa.id
              AND (l.situacao_do_cliente IS NULL OR l.situacao_do_cliente != 'Sem Interesse')
        ),
        elegiveis AS (
            SELECT
                r.tipo_lembrete,
                lc.lead_id,
                lc.data_servico
            FROM regras r
            CROSS JOIN leads_calc lc
            WHERE
                (r.tipo_lembrete = 'follow_up_pre_orcamento'
                 AND lc.situacao_do_cliente IN ('Reabordar', 'Interesse Futuro')
                 AND lc.data_contato IS NOT NULL
                 AND (v_hoje - lc.data_contato) > 0
                 AND r.cadencia_envio > 0 AND (v_hoje - lc.data_contato) % r.cadencia_envio = 0)
                OR
                (r.tipo_lembrete = 'follow_up_pos_orcamento'
                 AND lc.situacao_do_cliente IN ('Reabordar', 'Interesse Futuro')
                 AND lc.data_orcamento IS NOT NULL
                 AND (v_hoje - lc.data_orcamento) > 0
                 AND r.cadencia_envio > 0 AND (v_hoje - lc.data_orcamento) % r.cadencia_envio = 0)
                OR
                (r.tipo_lembrete = 'lembrete_agendamento'
                 AND lc.situacao_do_cliente = 'Agendado'
                 AND lc.data_servico IS NOT NULL
                 AND (lc.data_servico - v_hoje) > 0
                 AND (lc.data_servico - v_hoje) = r.cadencia_envio)
                OR
                (r.tipo_lembrete = 'pos_venda'
                 AND lc.situacao_do_cliente = 'Fechado'
                 AND lc.data_servico IS NOT NULL
                 AND (v_hoje - lc.data_servico) > 0
                 AND r.cadencia_envio > 0 AND (v_hoje - lc.data_servico) % r.cadencia_envio = 0)
        ),
        agrupados AS (
            SELECT
                tipo_lembrete,
                COUNT(lead_id)       AS qtd,
                MAX(data_servico)    AS max_data_servico
            FROM elegiveis
            GROUP BY tipo_lembrete
        )
        INSERT INTO public.lembretes_automacoes (
            id_empresa,
            tipo_lembrete,
            data_execucao,
            disparado,
            mensagem,
            data_servico
        )
        SELECT
            v_empresa.id,
            a.tipo_lembrete,
            v_hoje,
            FALSE,
            CASE
                WHEN a.tipo_lembrete = 'lembrete_agendamento' THEN
                    a.qtd || ' lead' || CASE WHEN a.qtd > 1 THEN 's' ELSE '' END ||
                    ' de Lembrete de Agendamento para hoje. Serviço' ||
                    CASE WHEN a.qtd > 1 THEN 's' ELSE '' END || ' agendado' ||
                    CASE WHEN a.qtd > 1 THEN 's' ELSE '' END || ' para ' ||
                    to_char(a.max_data_servico, 'DD/MM/YYYY') || '. Não deixe esquecer!'
                ELSE
                    a.qtd || ' lead' || CASE WHEN a.qtd > 1 THEN 's' ELSE '' END ||
                    ' de ' ||
                    CASE
                        WHEN a.tipo_lembrete = 'follow_up_pre_orcamento'  THEN 'follow_up_pre_orcamento'
                        WHEN a.tipo_lembrete = 'follow_up_pos_orcamento'  THEN 'follow_up_pos_orcamento'
                        WHEN a.tipo_lembrete = 'pos_venda'                THEN 'pos_venda'
                        ELSE a.tipo_lembrete
                    END ||
                    ' para mandar mensagem hoje. Não deixe esperando!'
            END AS mensagem,
            a.max_data_servico
        FROM agrupados a
        ON CONFLICT (id_empresa, tipo_lembrete, data_execucao)
        DO UPDATE SET
            mensagem = EXCLUDED.mensagem,
            data_servico = EXCLUDED.data_servico,
            data_atualizacao = now();
    END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_get_cadencia_leads_v2(
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
    v_hoje   DATE := p_hoje::DATE;
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
            r.tipo_lembrete,
            r.template_mensagem,
            ls.lead_nome,
            CASE
                WHEN r.tipo_lembrete = 'follow_up_pre_orcamento'  THEN v_hoje - ls.data_contato::date
                WHEN r.tipo_lembrete = 'follow_up_pos_orcamento'  THEN v_hoje - ls.data_orcamento::date
                WHEN r.tipo_lembrete = 'lembrete_agendamento'     THEN ls.data_servico_recente::date - v_hoje
                WHEN r.tipo_lembrete = 'pos_venda'                THEN v_hoje - ls.data_servico_recente::date
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
        )
    ),
    MensagensHoje AS (
        SELECT
            lead_id,
            tipo_lembrete,
            lead_nome,
            template_mensagem,
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
            'label',    CASE
                            WHEN tipo_lembrete = 'follow_up_pre_orcamento'  THEN 'Follow-up Pré-orçamento'
                            WHEN tipo_lembrete = 'follow_up_pos_orcamento'  THEN 'Follow-up Pós-orçamento'
                            WHEN tipo_lembrete = 'lembrete_agendamento'     THEN 'Lembrete de Agendamento'
                            WHEN tipo_lembrete = 'pos_venda'                THEN 'Pós-venda'
                            ELSE tipo_lembrete
                        END,
            'mensagem', CASE
                            WHEN template_mensagem IS NOT NULL AND template_mensagem != ''
                            THEN replace(replace(template_mensagem, '{nome}', lead_nome), '{dias}', '1')
                            ELSE 'Olá ' || lead_nome || '! 👋'
                        END
        )
    ), '{}'::json) INTO v_result
    FROM MensagensHoje
    WHERE rn = 1;

    RETURN v_result;
END;
$$;
