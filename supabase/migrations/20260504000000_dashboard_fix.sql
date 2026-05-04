DROP FUNCTION IF EXISTS public.fn_get_dashboard_data_v3(UUID, TEXT, TEXT, SMALLINT, SMALLINT);
DROP FUNCTION IF EXISTS public.fn_get_dashboard_data_v3(UUID, TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.fn_get_dashboard_data_v3(
    p_empresa_id UUID,
    p_start      TEXT,
    p_end        TEXT,
    p_month      INTEGER,
    p_year       INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_total_leads         INT     := 0;
    v_leads_trafego       INT     := 0;
    v_leads_organico      INT     := 0;
    v_leads_indicacao     INT     := 0;
    v_leads_fechados      INT     := 0;
    v_total_vendas        INT     := 0;
    v_faturamento         NUMERIC := 0;
    v_custo_anuncio       NUMERIC := 0;
    v_custo_operacional   NUMERIC := 0;
    v_meta_financeira     NUMERIC := 0;
BEGIN
    -- Estatísticas de leads em uma única consulta
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE origem_lead ILIKE 'Tráfego%'),
        COUNT(*) FILTER (WHERE origem_lead ILIKE 'Orgânico%'),
        COUNT(*) FILTER (WHERE origem_lead ILIKE 'Indicação%'),
        COUNT(*) FILTER (WHERE situacao_do_cliente ILIKE 'Fechado%')
    INTO
        v_total_leads,
        v_leads_trafego,
        v_leads_organico,
        v_leads_indicacao,
        v_leads_fechados
    FROM public.leads
    WHERE id_empresa = p_empresa_id
      AND data_criacao >= p_start::TIMESTAMPTZ
      AND data_criacao < p_end::TIMESTAMPTZ;

    -- Estatísticas de vendas e faturamento
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
      AND v.data_venda >= p_start::DATE
      AND v.data_venda <= p_end::DATE;

    -- Informações financeiras do mês
    SELECT
        COALESCE(MAX(custo_anuncio), 0),
        COALESCE(MAX(custo_operacional), 0),
        COALESCE(MAX(meta_financeira), 0)
    INTO
        v_custo_anuncio,
        v_custo_operacional,
        v_meta_financeira
    FROM public.financeiro
    WHERE id_empresa = p_empresa_id
      AND mes = p_month::SMALLINT
      AND ano = p_year::SMALLINT;

    RETURN json_build_object(
        'totalLeads',        v_total_leads,
        'leadsTrafego',      v_leads_trafego,
        'leadsOrganico',     v_leads_organico,
        'leadsIndicacao',    v_leads_indicacao,
        'leadsFechados',     v_leads_fechados,
        'totalVendas',       v_total_vendas,
        'faturamento',       v_faturamento,
        'custoAnuncio',      v_custo_anuncio,
        'custoOperacional',  v_custo_operacional,
        'metaFaturamento',   v_meta_financeira
    );
END;
$$;
