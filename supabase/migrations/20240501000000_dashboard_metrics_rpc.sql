CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_empresa_id UUID,
  p_start DATE,
  p_end DATE
) RETURNS JSON LANGUAGE plpgsql SECURITY INVOKER AS $$
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
  v_meta_faturamento NUMERIC := 0;
  v_conversao NUMERIC := 0;
  v_roi NUMERIC := 0;
  v_cac NUMERIC := 0;
  v_lucro_liquido NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
BEGIN
  -- Leads Metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE origem_lead = 'Tráfego'),
    COUNT(*) FILTER (WHERE origem_lead = 'Orgânico'),
    COUNT(*) FILTER (WHERE origem_lead = 'Indicação'),
    COUNT(*) FILTER (WHERE situacao_do_cliente = 'Fechado')
  INTO
    v_total_leads, v_leads_trafego, v_leads_organico, v_leads_indicacao, v_leads_fechados
  FROM public.leads
  WHERE id_empresa = p_empresa_id
    AND data_criacao >= p_start
    AND data_criacao < p_end;

  -- Vendas & Faturamento Metrics
  SELECT
    COUNT(DISTINCT v.id),
    COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0)
  INTO
    v_total_vendas, v_faturamento
  FROM public.vendas v
  JOIN public.leads l ON v.id_leads = l.id
  LEFT JOIN public.itens_vendas iv ON iv.id_vendas = v.id
  WHERE l.id_empresa = p_empresa_id
    AND v.data_venda >= p_start
    AND v.data_venda < p_end;

  -- Financeiro Metrics
  SELECT
    COALESCE(SUM(custo_anuncio), 0),
    COALESCE(SUM(custo_operacional), 0),
    COALESCE(SUM(meta_financeira), 0)
  INTO
    v_custo_anuncio, v_custo_operacional, v_meta_faturamento
  FROM public.financeiro
  WHERE id_empresa = p_empresa_id
    AND mes = EXTRACT(MONTH FROM p_start)
    AND ano = EXTRACT(YEAR FROM p_start);

  -- Calculated Metrics
  IF v_total_leads > 0 THEN
    v_conversao := (v_leads_fechados::NUMERIC / v_total_leads) * 100;
  END IF;

  IF v_custo_anuncio > 0 THEN
    v_roi := v_faturamento / v_custo_anuncio;
  END IF;

  IF v_total_vendas > 0 THEN
    v_cac := v_custo_anuncio / v_total_vendas;
    v_ticket_medio := v_faturamento / v_total_vendas;
  END IF;

  v_lucro_liquido := v_faturamento - (v_custo_anuncio + v_custo_operacional);

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
    'metaFaturamento', v_meta_faturamento,
    'conversao', v_conversao,
    'roi', v_roi,
    'cac', v_cac,
    'lucroLiquido', v_lucro_liquido,
    'ticketMedio', v_ticket_medio
  );
END;
$$;
