-- ==============================================================================
-- HARDENING SECURITY OF RPCs
-- Fixes IDOR and search_path vulnerabilities in SECURITY DEFINER functions.
-- ==============================================================================

-- 1. fn_get_user_role: set search_path
CREATE OR REPLACE FUNCTION public.fn_get_user_role() RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.user_roles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. fn_criar_perfil_usuario: set search_path
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_usuario() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, permissao, status) VALUES (NEW.id, NEW.email, 'viewer', 'ativo');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. fn_get_dashboard_data: restrict access and set search_path
CREATE OR REPLACE FUNCTION public.fn_get_dashboard_data(p_empresa_id UUID, p_start TIMESTAMP, p_end TIMESTAMP, p_month INT, p_year INT)
RETURNS JSON AS $$
DECLARE
    v_total_leads INT; v_faturamento NUMERIC; v_total_vendas INT;
    v_custo_anuncio NUMERIC; v_custo_operacional NUMERIC; v_meta_financeira NUMERIC;
BEGIN
    -- SECURITY CHECK: Ensure user has access to p_empresa_id
    IF NOT (
        EXISTS (SELECT 1 FROM public.empresas WHERE id = p_empresa_id AND id_usuario = auth.uid())
        OR public.fn_get_user_role() = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE id_empresa = p_empresa_id AND data_criacao >= p_start AND data_criacao < p_end;
    SELECT COUNT(DISTINCT v.id), COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0) INTO v_total_vendas, v_faturamento
    FROM public.vendas v JOIN public.leads l ON v.id_leads = l.id LEFT JOIN public.itens_vendas iv ON v.id = iv.id_vendas
    WHERE l.id_empresa = p_empresa_id AND v.data_venda >= p_start::date AND v.data_venda < p_end::date;
    SELECT COALESCE(custo_anuncio, 0), COALESCE(custo_operacional, 0), COALESCE(meta_financeira, 0)
    INTO v_custo_anuncio, v_custo_operacional, v_meta_financeira FROM public.financeiro WHERE id_empresa = p_empresa_id AND mes = p_month AND ano = p_year;
    RETURN json_build_object('totalLeads', v_total_leads, 'totalVendas', v_total_vendas, 'faturamento', v_faturamento, 'custoAnuncio', v_custo_anuncio, 'custoOperacional', v_custo_operacional, 'metaFaturamento', v_meta_financeira);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. fn_get_admin_overview: strict admin check and search_path, RESTORED ARRAY OUTPUT
CREATE OR REPLACE FUNCTION public.fn_get_admin_overview(p_start TIMESTAMP, p_end TIMESTAMP, p_month INT, p_year INT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar se é admin (SECURITY CHECK)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. gerar_lembretes_automacoes: set search path and verify access explicitly instead of REVOKE ALL
CREATE OR REPLACE FUNCTION public.gerar_lembretes_automacoes(p_id_empresa UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
    r_lead RECORD;
    r_regra RECORD;
    v_hoje DATE := CURRENT_DATE;
    v_data_base DATE;
    v_dias_passados INT;
    v_tipo TEXT;
    v_mensagem TEXT;
    v_data_servico DATE;
    v_is_admin BOOLEAN;
BEGIN
    -- SECURITY CHECK
    -- Allow execution if called by cron (anon/no auth) OR if the user has access to the specific p_id_empresa OR if admin
    v_is_admin := public.fn_get_user_role() = 'admin';
    IF auth.uid() IS NOT NULL THEN
        IF p_id_empresa IS NULL THEN
            IF NOT v_is_admin THEN
                RAISE EXCEPTION 'Access denied';
            END IF;
        ELSE
            IF NOT (EXISTS (SELECT 1 FROM public.empresas WHERE id = p_id_empresa AND id_usuario = auth.uid()) OR v_is_admin) THEN
                RAISE EXCEPTION 'Access denied';
            END IF;
        END IF;
    END IF;


    -- Percorre todos os leads que têm pelo menos um dos robôs ativos
    FOR r_lead IN
        SELECT l.*, v.data_servico
        FROM public.leads l
        LEFT JOIN LATERAL (SELECT data_servico FROM public.vendas v WHERE v.id_leads = l.id ORDER BY data_venda DESC LIMIT 1) v ON true
        WHERE (p_id_empresa IS NULL OR l.id_empresa = p_id_empresa)
          AND (l.robo_agendamento = TRUE OR l.robo_atendimento = TRUE OR l.robo_follow_ups = TRUE OR l.robo_pos_vendas = TRUE)
    LOOP
        -- Para cada regra da empresa do lead
        FOR r_regra IN
            SELECT * FROM public.regras_automacoes WHERE id_empresa = r_lead.id_empresa
        LOOP
            v_tipo := r_regra.tipo_lembrete;

            -- Pula se a situação do cliente ou momento_funil não bate com o tipo de lembrete
            IF v_tipo = 'lembrete_agendamento' AND (r_lead.momento_funil != 'Pos Orçamento' OR r_lead.situacao_do_cliente != 'Agendado') THEN CONTINUE; END IF;
            IF v_tipo = 'pos_venda' AND (r_lead.momento_funil != 'Pos Venda' OR r_lead.situacao_do_cliente != 'Fechado') THEN CONTINUE; END IF;
            IF v_tipo = 'follow_up_pre_orcamento' AND (r_lead.momento_funil != 'Pre Orçamento' OR r_lead.situacao_do_cliente NOT IN ('Reabordar', 'Interesse Futuro')) THEN CONTINUE; END IF;
            IF v_tipo = 'follow_up_pos_orcamento' AND (r_lead.momento_funil != 'Pos Orçamento' OR r_lead.situacao_do_cliente NOT IN ('Reabordar', 'Interesse Futuro')) THEN CONTINUE; END IF;

            -- Verifica se o robô específico do lead está ativo para esse tipo
            IF v_tipo = 'pos_venda' AND r_lead.robo_pos_vendas = FALSE THEN CONTINUE; END IF;
            IF v_tipo = 'lembrete_agendamento' AND r_lead.robo_agendamento = FALSE THEN CONTINUE; END IF;
            IF v_tipo LIKE 'follow_up_%' AND r_lead.robo_follow_ups = FALSE THEN CONTINUE; END IF;

            -- Define a data base para o cálculo
            v_data_base := NULL;
            v_data_servico := NULL;

            -- Aplicando as regras exatas de negócio do cliente
            IF v_tipo = 'lembrete_agendamento' THEN
                v_data_base := r_lead.data_servico::DATE;
                v_data_servico := r_lead.data_servico::DATE;
                IF v_data_base IS NOT NULL THEN
                    v_dias_passados := v_data_base - v_hoje; -- Dias ANTES da data do serviço
                END IF;
            ELSIF v_tipo = 'pos_venda' THEN
                v_data_base := r_lead.data_servico::DATE;
                v_data_servico := r_lead.data_servico::DATE;
                IF v_data_base IS NOT NULL THEN
                    v_dias_passados := v_hoje - v_data_base; -- Dias DEPOIS do serviço
                END IF;
            ELSIF v_tipo = 'follow_up_pos_orcamento' THEN
                v_data_base := r_lead.data_orcamento::DATE;
                IF v_data_base IS NOT NULL THEN
                    v_dias_passados := v_hoje - v_data_base; -- Dias DEPOIS do orçamento
                END IF;
            ELSIF v_tipo = 'follow_up_pre_orcamento' THEN
                v_data_base := r_lead.data_contato::DATE;
                IF v_data_base IS NOT NULL THEN
                    v_dias_passados := v_hoje - v_data_base; -- Dias DEPOIS do contato inicial
                END IF;
            END IF;

            -- Se temos uma data válida para basear a cadência
            IF v_data_base IS NOT NULL THEN
                -- Verificamos correspondência exata (=) de dias. A cadência 2 significa que vai enviar
                -- exatamente quando se passarem 2 dias (ou faltarem 2 dias no caso de agendamento).
                IF v_dias_passados = r_regra.cadencia_envio THEN
                    v_mensagem := REPLACE(COALESCE(r_regra.template_mensagem, ''), '{nome}', r_lead.nome);

                    IF NOT EXISTS (
                        SELECT 1 FROM public.lembretes_automacoes
                        WHERE id_empresa = r_lead.id_empresa
                          AND tipo_lembrete = v_tipo
                          AND data_execucao = v_hoje
                          AND mensagem = v_mensagem
                    ) THEN
                        INSERT INTO public.lembretes_automacoes (id_empresa, tipo_lembrete, data_execucao, mensagem, data_servico, disparado)
                        VALUES (r_lead.id_empresa, v_tipo, v_hoje, v_mensagem, v_data_servico, FALSE);
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. fn_get_cadencia_leads: restrict access and set search_path
CREATE OR REPLACE FUNCTION public.fn_get_cadencia_leads(p_empresa_id UUID, p_lead_ids UUID[])
RETURNS JSON AS $$
DECLARE
    r_lead RECORD;
    r_regra RECORD;
    v_hoje DATE := CURRENT_DATE;
    v_data_base DATE;
    v_dias_passados INT;
    v_result JSONB := '{}'::jsonb;
    v_mensagem TEXT;
BEGIN
    -- SECURITY CHECK: Ensure user has access to p_empresa_id
    IF NOT (
        EXISTS (SELECT 1 FROM public.empresas WHERE id = p_empresa_id AND id_usuario = auth.uid())
        OR public.fn_get_user_role() = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    FOR r_lead IN
        SELECT l.*, v.data_servico
        FROM public.leads l
        LEFT JOIN LATERAL (SELECT data_servico FROM public.vendas v WHERE v.id_leads = l.id ORDER BY data_venda DESC LIMIT 1) v ON true
        WHERE l.id_empresa = p_empresa_id AND l.id = ANY(p_lead_ids)
    LOOP
        -- Vamos encontrar a regra exata para hoje
        FOR r_regra IN
            SELECT * FROM public.regras_automacoes WHERE id_empresa = p_empresa_id
        LOOP
            -- Aplica regras restritas de momento_funil e situacao_do_cliente
            IF r_regra.tipo_lembrete = 'lembrete_agendamento' AND (r_lead.momento_funil != 'Pos Orçamento' OR r_lead.situacao_do_cliente != 'Agendado') THEN CONTINUE; END IF;
            IF r_regra.tipo_lembrete = 'pos_venda' AND (r_lead.momento_funil != 'Pos Venda' OR r_lead.situacao_do_cliente != 'Fechado') THEN CONTINUE; END IF;
            IF r_regra.tipo_lembrete = 'follow_up_pre_orcamento' AND (r_lead.momento_funil != 'Pre Orçamento' OR r_lead.situacao_do_cliente NOT IN ('Reabordar', 'Interesse Futuro')) THEN CONTINUE; END IF;
            IF r_regra.tipo_lembrete = 'follow_up_pos_orcamento' AND (r_lead.momento_funil != 'Pos Orçamento' OR r_lead.situacao_do_cliente NOT IN ('Reabordar', 'Interesse Futuro')) THEN CONTINUE; END IF;

            v_data_base := NULL;
            IF r_regra.tipo_lembrete = 'lembrete_agendamento' THEN
                v_data_base := r_lead.data_servico::DATE;
                IF v_data_base IS NOT NULL THEN v_dias_passados := v_data_base - v_hoje; END IF;
            ELSIF r_regra.tipo_lembrete = 'pos_venda' THEN
                v_data_base := r_lead.data_servico::DATE;
                IF v_data_base IS NOT NULL THEN v_dias_passados := v_hoje - v_data_base; END IF;
            ELSIF r_regra.tipo_lembrete = 'follow_up_pos_orcamento' THEN
                v_data_base := r_lead.data_orcamento::DATE;
                IF v_data_base IS NOT NULL THEN v_dias_passados := v_hoje - v_data_base; END IF;
            ELSIF r_regra.tipo_lembrete = 'follow_up_pre_orcamento' THEN
                v_data_base := r_lead.data_contato::DATE;
                IF v_data_base IS NOT NULL THEN v_dias_passados := v_hoje - v_data_base; END IF;
            END IF;

            -- Exigência: Correspondência EXATA de dias
            IF v_data_base IS NOT NULL AND v_dias_passados = r_regra.cadencia_envio THEN
                v_mensagem := REPLACE(COALESCE(r_regra.template_mensagem, ''), '{nome}', r_lead.nome);

                v_result := v_result || jsonb_build_object(
                    r_lead.id::text,
                    jsonb_build_object(
                        'mensagem', v_mensagem,
                        'tipo', r_regra.tipo_lembrete,
                        'label', CASE r_regra.tipo_lembrete
                                    WHEN 'follow_up_pre_orcamento' THEN 'Follow-up Pré-orçamento'
                                    WHEN 'follow_up_pos_orcamento' THEN 'Follow-up Pós-orçamento'
                                    WHEN 'lembrete_agendamento' THEN 'Lembrete de Agendamento'
                                    WHEN 'pos_venda' THEN 'Pós-venda'
                                 END,
                        'leadId', r_lead.id
                    )
                );
                EXIT; -- Pegamos a primeira regra válida para hoje e encerramos para este lead
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_result::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
