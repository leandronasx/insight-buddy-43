CREATE OR REPLACE FUNCTION public.fn_get_admin_overview(p_start TIMESTAMP, p_end TIMESTAMP, p_month INT, p_year INT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar se é admin
    IF COALESCE((SELECT role FROM public.user_roles WHERE user_id = auth.uid()), '') != 'admin' THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar esta função.';
    END IF;

    -- CTE e agregação principal
    WITH empresa_list AS (
        SELECT id, nome_empresa, nome_dono
        FROM public.empresas
        WHERE id_usuario != auth.uid()
    ),
    leads_metrics AS (
        SELECT
            id_empresa,
            COUNT(*) AS total_leads,
            COUNT(*) FILTER (WHERE situacao_do_cliente = 'Fechado') AS leads_fechados
        FROM public.leads
        WHERE data_criacao >= p_start::date AND data_criacao < p_end::date
        GROUP BY id_empresa
    ),
    vendas_metrics AS (
        SELECT
            l.id_empresa,
            COUNT(DISTINCT v.id) AS total_vendas,
            COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0) AS faturamento
        FROM public.vendas v
        JOIN public.leads l ON v.id_leads = l.id
        LEFT JOIN public.itens_vendas iv ON v.id = iv.id_vendas
        WHERE v.data_venda >= p_start::date AND v.data_venda < p_end::date
        GROUP BY l.id_empresa
    ),
    financeiro_metrics AS (
        SELECT
            id_empresa,
            COALESCE(custo_anuncio, 0) AS custo_anuncio
        FROM public.financeiro
        WHERE mes = p_month AND ano = p_year
    )
    SELECT json_agg(
        json_build_object(
            'id', e.id,
            'nome_empresa', e.nome_empresa,
            'nome_dono', e.nome_dono,
            'totalLeads', COALESCE(lm.total_leads, 0),
            'leadsFechados', COALESCE(lm.leads_fechados, 0),
            'totalVendas', COALESCE(vm.total_vendas, 0),
            'faturamento', COALESCE(vm.faturamento, 0),
            'custoAnuncio', COALESCE(fm.custo_anuncio, 0)
        )
    ) INTO v_result
    FROM empresa_list e
    LEFT JOIN leads_metrics lm ON e.id = lm.id_empresa
    LEFT JOIN vendas_metrics vm ON e.id = vm.id_empresa
    LEFT JOIN financeiro_metrics fm ON e.id = fm.id_empresa;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
