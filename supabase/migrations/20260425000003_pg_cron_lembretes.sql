-- 1. Habilitar a extensão pg_cron se suportado
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar a procedure que gera os lembretes
ALTER TABLE public.lembretes_automacoes DROP CONSTRAINT IF EXISTS lembretes_automacoes_id_empresa_tipo_lembrete_data_execucao_key;

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
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Agendar no cron (rodar às 02:00 todos os dias)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- O pg_cron usa cron.schedule(nome_job, cron_expression, query)
        PERFORM cron.schedule('gerar_lembretes_diarios', '0 2 * * *', 'SELECT public.gerar_lembretes_automacoes();');
    END IF;
END $$;
