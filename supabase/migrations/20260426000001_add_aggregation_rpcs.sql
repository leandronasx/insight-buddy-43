-- Drop the functions if they already exist
DROP FUNCTION IF EXISTS public.fn_get_dashboard_data(UUID, SMALLINT, SMALLINT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.fn_get_cadencia_leads(UUID, UUID[]);

-- Function to aggregate dashboard data efficiently inside Postgres
CREATE OR REPLACE FUNCTION public.fn_get_dashboard_data(
    p_empresa_id UUID,
    p_month SMALLINT,
    p_year SMALLINT,
    p_start TIMESTAMP WITH TIME ZONE,
    p_end TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_leads INT := 0;
    v_leads_trafego INT := 0;
    v_leads_organico INT := 0;
    v_leads_indicacao INT := 0;
    v_leads_fechados INT := 0;
    v_total_vendas INT := 0;
    v_faturamento NUMERIC := 0;
    v_custo_anuncio NUMERIC := 0;
    v_custo_operacional NUMERIC := 0;
    v_meta_financeira NUMERIC := 0;
BEGIN
    -- Obter estatísticas de leads em uma única consulta
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE origem_lead = 'Tráfego'),
        COUNT(*) FILTER (WHERE origem_lead = 'Orgânico'),
        COUNT(*) FILTER (WHERE origem_lead = 'Indicação'),
        COUNT(*) FILTER (WHERE situacao_do_cliente = 'Fechado')
    INTO
        v_total_leads,
        v_leads_trafego,
        v_leads_organico,
        v_leads_indicacao,
        v_leads_fechados
    FROM public.leads
    WHERE id_empresa = p_empresa_id
      AND data_criacao >= p_start
      AND data_criacao < p_end;

    -- Obter estatísticas de vendas (total de vendas e faturamento) para o mês correspondente
    SELECT
        COUNT(DISTINCT v.id),
        COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0)
    INTO
        v_total_vendas,
        v_faturamento
    FROM public.vendas v
    JOIN public.leads l ON v.id_leads = l.id
    LEFT JOIN public.itens_vendas iv ON v.id = iv.id_vendas
    WHERE l.id_empresa = p_empresa_id
      AND v.data_venda >= p_start::date
      AND v.data_venda < p_end::date;

    -- Obter informações financeiras
    SELECT
        COALESCE(custo_anuncio, 0),
        COALESCE(custo_operacional, 0),
        COALESCE(meta_financeira, 0)
    INTO
        v_custo_anuncio,
        v_custo_operacional,
        v_meta_financeira
    FROM public.financeiro
    WHERE id_empresa = p_empresa_id
      AND mes = p_month
      AND ano = p_year;

    -- Retornar os dados consolidados como JSON
    RETURN json_build_object(
        'totalLeads', v_total_leads,
        'leadsTrafego', v_leads_trafego,
        'leadsOrganico', v_leads_organico,
        'leadsIndicacao', v_leads_indicacao,
        'leadsFechados', v_leads_fechados,
        'totalVendas', v_total_vendas,
        'faturamento', v_faturamento,
        'custoAnuncio', v_custo_anuncio,
        'custoOperacional', v_custo_operacional,
        'metaFaturamento', v_meta_financeira
    );
END;
$$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.fn_get_cadencia_leads(UUID, UUID[]);

-- Function to check cadences entirely inside the database
CREATE OR REPLACE FUNCTION public.fn_get_cadencia_leads(
    p_empresa_id UUID,
    p_lead_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
            l.id as lead_id,
            l.nome as lead_nome,
            l.situacao_do_cliente,
            l.data_contato,
            l.data_orcamento,
            (
                SELECT v.data_servico
                FROM public.vendas v
                WHERE v.id_leads = l.id AND v.data_servico IS NOT NULL
                ORDER BY v.data_servico DESC LIMIT 1
            ) as data_servico_recente
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
                WHEN r.tipo_lembrete = 'follow_up_pre_orcamento' THEN
                    CURRENT_DATE - ls.data_contato::date
                WHEN r.tipo_lembrete = 'follow_up_pos_orcamento' THEN
                    CURRENT_DATE - ls.data_orcamento::date
                WHEN r.tipo_lembrete = 'lembrete_agendamento' THEN
                    ls.data_servico_recente::date - CURRENT_DATE
                WHEN r.tipo_lembrete = 'pos_venda' THEN
                    CURRENT_DATE - ls.data_servico_recente::date
                ELSE -1
            END as dias_diferenca,
            r.cadencia_envio
        FROM LeadsServicos ls
        CROSS JOIN Regras r
        WHERE (
            (ls.situacao_do_cliente = 'Agendado' AND r.tipo_lembrete = 'lembrete_agendamento') OR
            (ls.situacao_do_cliente = 'Fechado' AND r.tipo_lembrete = 'pos_venda') OR
            (ls.situacao_do_cliente IN ('Reabordar', 'Interesse Futuro') AND r.tipo_lembrete IN ('follow_up_pre_orcamento', 'follow_up_pos_orcamento'))
        )
    ),
    MensagensHoje AS (
        SELECT
            lead_id,
            tipo_lembrete,
            lead_nome,
            template_mensagem,
            ROW_NUMBER() OVER(PARTITION BY lead_id ORDER BY tipo_lembrete) as rn
        FROM CadenciasCalculadas
        WHERE dias_diferenca > 0 AND (
            (tipo_lembrete = 'lembrete_agendamento' AND dias_diferenca = cadencia_envio) OR
            (tipo_lembrete != 'lembrete_agendamento' AND CAST(dias_diferenca AS INTEGER) % cadencia_envio = 0)
        )
    )
    SELECT COALESCE(json_object_agg(
        lead_id,
        json_build_object(
            'tipo', tipo_lembrete,
            'leadId', lead_id,
            'label', CASE
                        WHEN tipo_lembrete = 'follow_up_pre_orcamento' THEN 'Follow-up Pré-orçamento'
                        WHEN tipo_lembrete = 'follow_up_pos_orcamento' THEN 'Follow-up Pós-orçamento'
                        WHEN tipo_lembrete = 'lembrete_agendamento' THEN 'Lembrete de Agendamento'
                        WHEN tipo_lembrete = 'pos_venda' THEN 'Pós-venda'
                        ELSE tipo_lembrete
                     END,
            'mensagem', COALESCE(REPLACE(REPLACE(template_mensagem, '{nome}', lead_nome), '{dias}', '1'), 'Olá ' || lead_nome || '! 👋')
        )
    ), '{}'::json) INTO v_result
    FROM MensagensHoje
    WHERE rn = 1;

    RETURN v_result;
END;
$$;
