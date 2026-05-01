-- ============================================================
--  novo_schema_completo.sql
--  Gerado a partir do banco existente via information_schema
--  Compatível com Supabase (PostgreSQL + RLS + auth.uid())
-- ============================================================


-- ============================================================
-- 0. EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. TABELAS  (ordem respeitando dependências de FK)
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 usuarios
--     id vem do auth.users do Supabase (sem uuid_generate_v4)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID        NOT NULL,
    email            TEXT        NOT NULL,
    senha            TEXT,
    status           TEXT        NOT NULL DEFAULT 'ativo'::TEXT,
    permissao        TEXT        NOT NULL DEFAULT 'viewer'::TEXT,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT usuarios_pkey        PRIMARY KEY (id),
    CONSTRAINT usuarios_email_unique UNIQUE (email)
);

-- ------------------------------------------------------------
-- 1.2 user_roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id      UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role    TEXT NOT NULL,

    CONSTRAINT user_roles_pkey        PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

-- ------------------------------------------------------------
-- 1.3 empresas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_usuario       UUID        NOT NULL,
    nome_empresa     TEXT        NOT NULL,
    nome_dono        TEXT,
    cnpj_cpf         TEXT,
    endereco         TEXT,
    logo_url         TEXT,
    cor_primaria     TEXT,
    cor_secundaria   TEXT,
    data_inicio      DATE,
    data_termino     DATE,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    telefone         TEXT,

    CONSTRAINT empresas_pkey          PRIMARY KEY (id),
    CONSTRAINT empresas_cnpj_cpf_key  UNIQUE (cnpj_cpf),
    CONSTRAINT empresas_id_usuario_fk FOREIGN KEY (id_usuario)
        REFERENCES public.usuarios (id)
);

-- ------------------------------------------------------------
-- 1.4 leads
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id                   UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_empresa           UUID        NOT NULL,
    nome                 TEXT        NOT NULL,
    telefone             TEXT,
    email                TEXT,
    cnpj_cpf             TEXT,
    endereco             TEXT,
    origem_lead          TEXT,
    situacao_do_cliente  TEXT,
    momento_funil        TEXT,
    robo_pos_vendas      BOOLEAN     DEFAULT FALSE,
    robo_follow_ups      BOOLEAN     DEFAULT FALSE,
    robo_atendimento     BOOLEAN     DEFAULT FALSE,
    robo_agendamento     BOOLEAN     DEFAULT FALSE,
    qualificacao         TEXT,
    data_contato         TIMESTAMPTZ,
    data_orcamento       TIMESTAMPTZ,
    data_criacao         TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT leads_pkey          PRIMARY KEY (id),
    CONSTRAINT leads_id_empresa_fk FOREIGN KEY (id_empresa)
        REFERENCES public.empresas (id)
);

-- ------------------------------------------------------------
-- 1.5 financeiro
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financeiro (
    id                 UUID      NOT NULL DEFAULT uuid_generate_v4(),
    id_empresa         UUID      NOT NULL,
    ano                SMALLINT  NOT NULL,
    mes                SMALLINT  NOT NULL,
    meta_financeira    NUMERIC   DEFAULT 0,
    custo_operacional  NUMERIC   DEFAULT 0,
    custo_anuncio      NUMERIC   DEFAULT 0,
    data_criacao       TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT financeiro_pkey              PRIMARY KEY (id),
    CONSTRAINT financeiro_empresa_ano_mes   UNIQUE (id_empresa, ano, mes),
    CONSTRAINT financeiro_id_empresa_fk     FOREIGN KEY (id_empresa)
        REFERENCES public.empresas (id)
);

-- ------------------------------------------------------------
-- 1.6 regras_automacoes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regras_automacoes (
    id                UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_empresa        UUID        NOT NULL,
    tipo_lembrete     TEXT        NOT NULL,
    cadencia_envio    INTEGER     NOT NULL DEFAULT 1,
    template_mensagem TEXT,
    data_criacao      TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT regras_automacoes_pkey          PRIMARY KEY (id),
    CONSTRAINT regras_automacoes_id_empresa_fk FOREIGN KEY (id_empresa)
        REFERENCES public.empresas (id)
);

-- ------------------------------------------------------------
-- 1.7 lembretes_automacoes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lembretes_automacoes (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    tipo_lembrete    TEXT        NOT NULL,
    data_execucao    DATE,
    disparado        BOOLEAN     DEFAULT FALSE,
    mensagem         TEXT,
    data_servico     DATE,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    id_empresa       UUID,

    CONSTRAINT lembretes_automacoes_pkey                      PRIMARY KEY (id),
    -- Constraint composta usada no ON CONFLICT de gerar_lembretes_automacoes
    CONSTRAINT lembretes_automacoes_empresa_tipo_data_unique  UNIQUE (id_empresa, tipo_lembrete, data_execucao),
    CONSTRAINT lembretes_automacoes_id_empresa_fk             FOREIGN KEY (id_empresa)
        REFERENCES public.empresas (id)
);

-- ------------------------------------------------------------
-- 1.8 vendas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendas (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_leads         UUID        NOT NULL,
    data_venda       DATE        NOT NULL DEFAULT CURRENT_DATE,
    data_servico     DATE,
    horario_servico  TIMETZ,
    status           TEXT        NOT NULL DEFAULT 'pendente'::TEXT,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT vendas_pkey        PRIMARY KEY (id),
    CONSTRAINT vendas_id_leads_fk FOREIGN KEY (id_leads)
        REFERENCES public.leads (id)
);

-- ------------------------------------------------------------
-- 1.9 itens_vendas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.itens_vendas (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_vendas        UUID        NOT NULL,
    estofado         TEXT        NOT NULL,
    valor            NUMERIC     NOT NULL DEFAULT 0,
    bonus            NUMERIC     DEFAULT 0,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT itens_vendas_pkey        PRIMARY KEY (id),
    CONSTRAINT itens_vendas_id_vendas_fk FOREIGN KEY (id_vendas)
        REFERENCES public.vendas (id)
);

-- ------------------------------------------------------------
-- 1.10 os (Ordens de Serviço)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.os (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_vendas        UUID        NOT NULL,
    enviado          BOOLEAN     DEFAULT FALSE,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT os_pkey        PRIMARY KEY (id),
    CONSTRAINT os_id_vendas_fk FOREIGN KEY (id_vendas)
        REFERENCES public.vendas (id)
);

-- ------------------------------------------------------------
-- 1.11 historico_atendimento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historico_atendimento (
    id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
    id_leads         UUID        NOT NULL,
    data_interacao   TIMESTAMPTZ NOT NULL DEFAULT now(),
    tipo             TEXT        NOT NULL,
    mensagem         TEXT,
    data_criacao     TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT historico_atendimento_pkey        PRIMARY KEY (id),
    CONSTRAINT historico_atendimento_id_leads_fk FOREIGN KEY (id_leads)
        REFERENCES public.leads (id)
);


-- ============================================================
-- 2. FUNÇÕES  (antes dos triggers e policies que as usam)
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 fn_set_data_atualizacao  — trigger genérico de updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_data_atualizacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2.2 fn_get_user_role  — retorna o role do usuário logado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- ------------------------------------------------------------
-- 2.3 fn_criar_perfil_usuario  — trigger após INSERT em auth.users
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, permissao, status)
    VALUES (NEW.id, NEW.email, 'viewer', 'ativo')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2.4 fn_configurar_regras_padrao_empresa  — trigger após INSERT em empresas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_configurar_regras_padrao_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.regras_automacoes (id_empresa, tipo_lembrete, cadencia_envio, template_mensagem)
    VALUES 
        -- FOLLOW-UP PÓS ORÇAMENTO
        (NEW.id, 'follow_up_pos_orcamento', 2,  'Olá, {nome}! Espero que esteja tudo bem.\nConversamos alguns dias atrás, você conseguiu analisar a nossa proposta para o tratamento de beleza do seu estofado. Para te ajudar a decidir, posso te enviar um material completo com fotos de antes e depois dos nossos serviços?\nAssim, você pode ter certeza da qualidade do nosso trabalho e ver o resultado que podemos entregar.'),
        (NEW.id, 'follow_up_pos_orcamento', 5,  '{nome}, com total sinceridade, percebo que você gostou do nosso serviço, mas ainda não avançou. Existe algo que ainda te impede de realizar?\nPode ser uma questão de valor, agenda ou qualquer outra coisa. Estou aqui para te ajudar a resolver essa última barreira e garantir que você tenha o melhor serviço.'),
        (NEW.id, 'follow_up_pos_orcamento', 8,  '{nome}. gostaria de fazer uma pergunta, para poder entender e ajudar na sua decisão. O que realmente faltou no nosso orçamento, para você poder *tomar a decisão*, quero garantir que vamos entregar o que você precisa e que _se sinta segura_ em tomar a decisão de fazer o serviço.'),
        (NEW.id, 'follow_up_pos_orcamento', 11, '{nome}, você desistiu de realizar nosso serviço ou só ficou preso(a) na rotina mesmo?\nMe parece que você ainda não está seguro(a) da decisão. O que falta para avançarmos e agendar a transformação do seu estofado?'),
        (NEW.id, 'follow_up_pos_orcamento', 14, 'Olá, {nome}!\nPercebi que não conseguimos nos falar, e para não tomar seu tempo, gostaria de te perguntar com sinceridade: hoje você tem interesse em dar continuidade ao seu serviço?\nSe sim, me coloco à disposição para o que você precisar. Se não, por favor, me avise para que eu possa tirar o seu contato da nossa lista de prioridade e não te incomodar mais.'),
        (NEW.id, 'follow_up_pos_orcamento', 17, '{nome}, você ainda tá ai? Estou vendo que estamos com dificuldade de se falar, sei que as vezes na correria visualizamos a mensagem e esquecemos de responder.\nGostaria de pedir uma ajuda para você, neste momento o seu *não* me ajudaria muito mais que o seu *sim*, porque o seu *não* me ajudaria a entender que não é seu momento de _resolver o problema da sujeira do seu estofado_, para eu também não te mandar mais mensagem, para eu liberar seu atendimento e atender outros clientes que estão interessados.'),
        (NEW.id, 'follow_up_pos_orcamento', 20, '{nome}, OOlá... Só passando para avisar que estamos encerrando os agendamentos para este mês.\nSe ainda quiser garantir sua limpeza ou impermeabilização, me avise o quanto antes!\n\nVeja o que podemos fazer por você: ⬇️\ninstagram.com/usuario_instagram'),
        (NEW.id, 'follow_up_pos_orcamento', 23, '{nome}, ⁠⁠como não tivemos retorno, vamos encerrar seu atendimento.\nCaso ainda tenha interesse, pode nos chamar enquanto houver disponibilidade.\n\nAgradecemos o seu contato e esperamos poder atendê-lo no futuro! Enquanto isso, veja os resultados do nosso trabalho: ⬇️\ninstagram.com/usuario_instagram'),

        -- FOLLOW-UP PRÉ ORÇAMENTO
        (NEW.id, 'follow_up_pre_orcamento', 1,  '{nome} olá, vi que recentemente nos enviou uma mensagem solicitando um orçamento para higienização do seu estofado.\n\nPara um orçamento mais preciso e rápido, seria ótimo se pudesse enviar algumas fotos do estofado aqui mesmo pelo WhatsApp.'),
        (NEW.id, 'follow_up_pre_orcamento', 4,  '{nome}, espero que esteja tudo bem por aí!\nPreciso saber se você ainda está interessado em fazer o serviço conosco. instagram.com/usuario_instagram'),
        (NEW.id, 'follow_up_pre_orcamento', 7,  '{nome} ⁠⁠OOOii, e aí tudo certo? Percebi que ainda não conseguimos concluir seu atendimento.'),
        (NEW.id, 'follow_up_pre_orcamento', 10, '⁠⁠{nome}, sei que a correria do dia a dia é grande, mas queria saber se ainda tem interesse no nosso serviço.\nPodemos continuar sua avaliação?'),
        (NEW.id, 'follow_up_pre_orcamento', 13, '{nome}, só passando para lembrar que ainda temos condições especiais para higienização e impermeabilização!\n⁠⁠Seu interesse seria em qual serviço mesmo?'),
        (NEW.id, 'follow_up_pre_orcamento', 16, '{nome}, estamos fechando a lista de atendimentos e, caso não tenha mais interesse, seu cadastro será arquivado.'),
        (NEW.id, 'follow_up_pre_orcamento', 19, '{nome}, Olá... Só passando para avisar que estamos encerrando os agendamentos para este mês.\n\nVeja o que podemos fazer por você: ⬇️\ninstagram.com/usuario_instagram'),
        (NEW.id, 'follow_up_pre_orcamento', 22, '⁠⁠{nome}, como não tivemos retorno, vamos encerrar seu atendimento.\n\nDepois disso, não sei quando teremos novas vagas disponíveis.\n\nAgradecemos o seu contato e esperamos poder atendê-lo no futuro! Enquanto isso, veja os resultados do nosso trabalho: ⬇️\ninstagram.com/usuario_instagram'),

        -- LEMBRETE AGENDAMENTO
        (NEW.id, 'lembrete_agendamento', 1,  'Olá, {nome}, é AMANHÃ! 🚀\nPassando para confirmar nosso serviço de higienização.'),
        (NEW.id, 'lembrete_agendamento', 5,  'Oi {nome}, está chegando o dia! 🎉\nFaltam apenas 5 dias para o serviço da {nome_empresa} na sua residência.'),
        (NEW.id, 'lembrete_agendamento', 15, '{nome}, tudo bem?\nPassando para te avisar que falta pouco mais de duas semanas para o nosso agendamento de higienização! 🗓️'),

        -- PÓS VENDA
        (NEW.id, 'pos_venda', 2,   'Olá, {nome}! Tudo bem?\nAqui é da {nome_empresa}. Estamos em fase de melhoria contínua e sua opinião é muito importante para nós. Gostaria de saber como você avalia o serviço de higienização:\nVocê ficou satisfeito?\nO resultado atendeu às expectativas?'),
        (NEW.id, 'pos_venda', 3,   '{nome}, tudo bem? Se puder nos indicar para conhecidos ou grupo do condomínio — como você gostou e quer nos ajudar a transformar mais lares.\nPodemos?'),
        (NEW.id, 'pos_venda', 90,  'Olá, {nome}! Sabia que também somos especializados em impermeabilização?\nVocê precisa de algum serviço no seu estofado ou em outro móvel? Posso encaminhar um vídeo da nossa impermeabilização?'),
        (NEW.id, 'pos_venda', 180, 'Olá, {nome}! Como cliente fiel, gostaríamos de oferecer uma bonificação especial na sua próxima limpeza.\nQue tal agendarmos para garantir que fiquem impecáveis como da última vez?'),
        (NEW.id, 'pos_venda', 240, 'Olá, {nome}! Agradecemos a confiança.\nQue tal garantir a manutenção da saúde da sua família com uma nova higienização profissional?'),
        (NEW.id, 'pos_venda', 360, 'Olá, {nome}! Faz um ano desde sua última limpeza!\nPara manter a garantia e a vida útil do seu estofado, recomendamos uma nova higienização completa. Vamos agendar?');

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2.5 fn_get_dashboard_data  — dados consolidados do dashboard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_dashboard_data(
    p_empresa_id UUID,
    p_start      TIMESTAMPTZ,
    p_end        TIMESTAMPTZ,
    p_month      SMALLINT,
    p_year       SMALLINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
      AND v.data_venda >= p_start::date 
      AND v.data_venda < p_end::date;

    -- Informações financeiras do mês
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

-- ------------------------------------------------------------
-- 2.6 gerar_lembretes_automacoes  — procedure de automação
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_lembretes_automacoes(
    p_id_empresa UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa RECORD;
    v_hoje    DATE := CURRENT_DATE;
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
            mensagem         = EXCLUDED.mensagem,
            data_servico     = EXCLUDED.data_servico,
            data_atualizacao = NOW();

    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 2.7 fn_get_cadencia_leads  — cadência de mensagens por lead
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_cadencia_leads(
    p_empresa_id UUID,
    p_lead_ids   UUID[]
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
            r.tipo_lembrete,
            r.template_mensagem,
            ls.lead_nome,
            CASE 
                WHEN r.tipo_lembrete = 'follow_up_pre_orcamento'  THEN CURRENT_DATE - ls.data_contato::date
                WHEN r.tipo_lembrete = 'follow_up_pos_orcamento'  THEN CURRENT_DATE - ls.data_orcamento::date
                WHEN r.tipo_lembrete = 'lembrete_agendamento'     THEN ls.data_servico_recente::date - CURRENT_DATE
                WHEN r.tipo_lembrete = 'pos_venda'                THEN CURRENT_DATE - ls.data_servico_recente::date
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
            'mensagem', COALESCE(
                            REPLACE(REPLACE(template_mensagem, '{nome}', lead_nome), '{dias}', '1'),
                            'Olá ' || lead_nome || '! 👋'
                        )
        )
    ), '{}'::json) INTO v_result
    FROM MensagensHoje
    WHERE rn = 1;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------
-- 2.8 fn_get_admin_overview  — visão geral para administradores
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_admin_overview(
    p_start  TIMESTAMPTZ,
    p_end    TIMESTAMPTZ,
    p_month  SMALLINT,
    p_year   SMALLINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar se é admin
    IF COALESCE((SELECT role FROM public.user_roles WHERE user_id = auth.uid()), '') != 'admin' THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar esta função.';
    END IF;

    WITH empresa_list AS (
        SELECT id, nome_empresa, nome_dono 
        FROM public.empresas 
        WHERE id_usuario != auth.uid()
    ),
    leads_metrics AS (
        SELECT 
            id_empresa,
            COUNT(*)                                              AS total_leads,
            COUNT(*) FILTER (WHERE situacao_do_cliente = 'Fechado') AS leads_fechados
        FROM public.leads
        WHERE data_criacao >= p_start::date AND data_criacao < p_end::date
        GROUP BY id_empresa
    ),
    vendas_metrics AS (
        SELECT 
            l.id_empresa,
            COUNT(DISTINCT v.id)                                       AS total_vendas,
            COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0)        AS faturamento
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
            'id',           e.id,
            'nome_empresa', e.nome_empresa,
            'nome_dono',    e.nome_dono,
            'totalLeads',   COALESCE(lm.total_leads,    0),
            'leadsFechados', COALESCE(lm.leads_fechados, 0),
            'totalVendas',  COALESCE(vm.total_vendas,   0),
            'faturamento',  COALESCE(vm.faturamento,    0),
            'custoAnuncio', COALESCE(fm.custo_anuncio,  0)
        )
    ) INTO v_result
    FROM empresa_list e
    LEFT JOIN leads_metrics      lm ON e.id = lm.id_empresa
    LEFT JOIN vendas_metrics     vm ON e.id = vm.id_empresa
    LEFT JOIN financeiro_metrics fm ON e.id = fm.id_empresa;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- ------------------------------------------------------------
-- 2.9 rls_auto_enable  — event trigger: habilita RLS em novas tabelas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cmd RECORD;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
       AND cmd.schema_name IN ('public')
       AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
       AND cmd.schema_name NOT LIKE 'pg_toast%'
       AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (system schema or not enforced: %.)', cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

-- Event trigger para rls_auto_enable
CREATE EVENT TRIGGER rls_auto_enable_trigger
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    EXECUTE FUNCTION public.rls_auto_enable();


-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Trigger no auth.users (Supabase) para criar perfil automático
CREATE OR REPLACE TRIGGER trg_criar_perfil_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_criar_perfil_usuario();

-- Trigger: regras padrão ao criar empresa
CREATE OR REPLACE TRIGGER trg_configurar_regras_empresa
    AFTER INSERT ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_configurar_regras_padrao_empresa();

-- Triggers de updated_at
CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_usuarios
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_empresas
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_financeiro
    BEFORE UPDATE ON public.financeiro
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_regras_automacoes
    BEFORE UPDATE ON public.regras_automacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_leads
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_vendas
    BEFORE UPDATE ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_itens_vendas
    BEFORE UPDATE ON public.itens_vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_os
    BEFORE UPDATE ON public.os
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_historico_atendimento
    BEFORE UPDATE ON public.historico_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();

CREATE OR REPLACE TRIGGER trg_set_data_atualizacao_lembretes_automacoes
    BEFORE UPDATE ON public.lembretes_automacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_data_atualizacao();


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_automacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_vendas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimento ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLICIES
-- ============================================================

-- ------------------------------------------------------------
-- usuarios
-- ------------------------------------------------------------
CREATE POLICY "usuarios: acesso"
    ON public.usuarios FOR ALL TO public
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios: update proprio"
    ON public.usuarios FOR UPDATE TO public
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- user_roles
-- ------------------------------------------------------------
CREATE POLICY user_roles_select_own
    ON public.user_roles FOR SELECT TO public
    USING (user_id = auth.uid());

CREATE POLICY "user_roles: select"
    ON public.user_roles FOR SELECT TO public
    USING (
        (user_id = auth.uid())
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- empresas
-- ------------------------------------------------------------
CREATE POLICY "Admin ver/edita/cria/deleta empresa"
    ON public.empresas FOR ALL TO public
    USING (
        (id_usuario = auth.uid())
        OR (EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid() AND u.permissao = 'admin'::text
        ))
    )
    WITH CHECK (
        (id_usuario = auth.uid())
        OR (EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.id = auth.uid() AND u.permissao = 'admin'::text
        ))
    );

CREATE POLICY "empresas: acesso"
    ON public.empresas FOR ALL TO public
    USING (
        (id_usuario = auth.uid())
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- leads
-- ------------------------------------------------------------
CREATE POLICY "leads: acesso_total_admin_ou_proprio"
    ON public.leads FOR ALL TO public
    USING (
        ((SELECT user_roles.role FROM user_roles WHERE user_roles.user_id = auth.uid()) = 'admin'::text)
        OR (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid()
        ))
    );

CREATE POLICY "leads: acesso"
    ON public.leads FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- financeiro
-- ------------------------------------------------------------
CREATE POLICY "financeiro: acesso_admin_ou_dono"
    ON public.financeiro FOR ALL TO public
    USING (
        ((SELECT user_roles.role FROM user_roles WHERE user_roles.user_id = auth.uid()) = 'admin'::text)
        OR (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid()
        ))
    );

CREATE POLICY "financeiro: acesso"
    ON public.financeiro FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- regras_automacoes
-- ------------------------------------------------------------
CREATE POLICY "regras_automacoes: somente da propria empresa"
    ON public.regras_automacoes FOR ALL TO public
    USING (
        id_empresa IN (
            SELECT empresas.id FROM empresas
            WHERE empresas.id_usuario = auth.uid()
        )
    );

CREATE POLICY "regras_automacoes: acesso"
    ON public.regras_automacoes FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = regras_automacoes.id_empresa AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- lembretes_automacoes
-- ------------------------------------------------------------
CREATE POLICY "lembretes_automacoes: acesso"
    ON public.lembretes_automacoes FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = lembretes_automacoes.id_empresa AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- vendas
-- ------------------------------------------------------------
CREATE POLICY "vendas: acesso_admin_ou_dono"
    ON public.vendas FOR ALL TO public
    USING (
        ((SELECT user_roles.role FROM user_roles WHERE user_roles.user_id = auth.uid()) = 'admin'::text)
        OR (EXISTS (
            SELECT 1
            FROM leads l
            JOIN empresas e ON e.id = l.id_empresa
            WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid()
        ))
    );

CREATE POLICY "vendas: acesso"
    ON public.vendas FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1
            FROM leads l
            JOIN empresas e ON l.id_empresa = e.id
            WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- itens_vendas
-- ------------------------------------------------------------
CREATE POLICY "itens_vendas: acesso_admin_ou_dono"
    ON public.itens_vendas FOR ALL TO public
    USING (
        ((SELECT user_roles.role FROM user_roles WHERE user_roles.user_id = auth.uid()) = 'admin'::text)
        OR (EXISTS (
            SELECT 1
            FROM vendas v
            JOIN leads l ON l.id = v.id_leads
            JOIN empresas e ON e.id = l.id_empresa
            WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid()
        ))
    );

CREATE POLICY "itens_vendas: acesso"
    ON public.itens_vendas FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1
            FROM vendas v
            JOIN leads l ON v.id_leads = l.id
            JOIN empresas e ON l.id_empresa = e.id
            WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- os
-- ------------------------------------------------------------
CREATE POLICY "os: somente das proprias vendas"
    ON public.os FOR ALL TO public
    USING (
        id_vendas IN (
            SELECT v.id
            FROM vendas v
            JOIN leads l ON l.id = v.id_leads
            JOIN empresas e ON e.id = l.id_empresa
            WHERE e.id_usuario = auth.uid()
        )
    );

CREATE POLICY "os: acesso"
    ON public.os FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1
            FROM vendas v
            JOIN leads l ON v.id_leads = l.id
            JOIN empresas e ON l.id_empresa = e.id
            WHERE v.id = os.id_vendas AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );

-- ------------------------------------------------------------
-- historico_atendimento
-- ------------------------------------------------------------
CREATE POLICY "historico_atendimento: somente dos proprios leads"
    ON public.historico_atendimento FOR ALL TO public
    USING (
        id_leads IN (
            SELECT l.id
            FROM leads l
            JOIN empresas e ON e.id = l.id_empresa
            WHERE e.id_usuario = auth.uid()
        )
    );

CREATE POLICY "historico_atendimento: acesso"
    ON public.historico_atendimento FOR ALL TO public
    USING (
        (EXISTS (
            SELECT 1
            FROM leads l
            JOIN empresas e ON l.id_empresa = e.id
            WHERE l.id = historico_atendimento.id_leads AND e.id_usuario = auth.uid()
        ))
        OR (fn_get_user_role() = 'admin'::text)
    );


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================