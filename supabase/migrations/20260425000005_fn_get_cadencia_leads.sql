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
$$ LANGUAGE plpgsql SECURITY DEFINER;
