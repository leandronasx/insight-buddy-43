-- 1. Alter table
ALTER TABLE public.lembretes_automacoes DROP COLUMN IF EXISTS id_leads CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lembretes_automacoes' AND column_name='id_empresa') THEN
        ALTER TABLE public.lembretes_automacoes ADD COLUMN id_empresa UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE public.lembretes_automacoes ALTER COLUMN data_execucao TYPE DATE USING data_execucao::DATE;

-- Add unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_lembretes_empresa_tipo_data'
    ) THEN
        ALTER TABLE public.lembretes_automacoes ADD CONSTRAINT uq_lembretes_empresa_tipo_data UNIQUE (id_empresa, tipo_lembrete, data_execucao);
    END IF;
END $$;

-- 2. Stored Procedure
CREATE OR REPLACE FUNCTION public.gerar_lembretes_automacoes(p_id_empresa UUID DEFAULT NULL)
RETURNS void AS $BODY$
DECLARE
    v_empresa RECORD;
    v_hoje DATE := CURRENT_DATE;
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
                COUNT(lead_id) AS qtd,
                MAX(data_servico) AS max_data_servico
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
                        WHEN a.tipo_lembrete = 'follow_up_pre_orcamento' THEN 'Follow-up Pré-orçamento'
                        WHEN a.tipo_lembrete = 'follow_up_pos_orcamento' THEN 'Follow-up Pós-orçamento'
                        WHEN a.tipo_lembrete = 'pos_venda' THEN 'Pós-venda'
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
            data_atualizacao = NOW();

    END LOOP;
END;
$BODY$ LANGUAGE plpgsql;
