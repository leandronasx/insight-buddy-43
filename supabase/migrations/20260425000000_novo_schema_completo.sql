-- ============================================================
-- 1. CONFIGURAÇÕES INICIAIS E EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABELAS (DDL)
-- ============================================================

-- USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY,
    email            TEXT NOT NULL UNIQUE,
    senha            TEXT,
    status           TEXT NOT NULL DEFAULT 'ativo'::text,
    permissao        TEXT NOT NULL DEFAULT 'viewer'::text,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ROLES DE USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_roles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL UNIQUE,
    role             TEXT NOT NULL,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario       UUID NOT NULL,
    nome_empresa     TEXT NOT NULL,
    nome_dono        TEXT,
    cnpj_cpf         TEXT UNIQUE,
    endereco         TEXT,
    logo_url         TEXT,
    cor_primaria     TEXT,
    cor_secundaria   TEXT,
    telefone         TEXT,
    data_inicio      DATE,
    data_termino     DATE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- LEADS
CREATE TABLE IF NOT EXISTS public.leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa          UUID NOT NULL,
    nome                TEXT NOT NULL,
    telefone            TEXT,
    email               TEXT,
    cnpj_cpf            TEXT,
    endereco            TEXT,
    origem_lead         TEXT,
    situacao_do_cliente TEXT,
    momento_funil       TEXT,
    qualificacao        TEXT,
    robo_pos_vendas     BOOLEAN DEFAULT FALSE,
    robo_follow_ups     BOOLEAN DEFAULT FALSE,
    robo_atendimento    BOOLEAN DEFAULT FALSE,
    robo_agendamento    BOOLEAN DEFAULT FALSE,
    data_contato        TIMESTAMP WITH TIME ZONE,
    data_orcamento      TIMESTAMP WITH TIME ZONE,
    data_criacao        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL,
    data_venda       DATE NOT NULL DEFAULT CURRENT_DATE,
    data_servico     DATE,
    horario_servico  TIME WITH TIME ZONE,
    status           TEXT NOT NULL DEFAULT 'pendente'::text,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ITENS DE VENDAS
CREATE TABLE IF NOT EXISTS public.itens_vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL,
    estofado         TEXT NOT NULL,
    valor            NUMERIC NOT NULL DEFAULT 0,
    bonus            NUMERIC DEFAULT 0,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- FINANCEIRO
CREATE TABLE IF NOT EXISTS public.financeiro (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL,
    ano               SMALLINT NOT NULL,
    mes               SMALLINT NOT NULL,
    meta_financeira   NUMERIC DEFAULT 0,
    custo_operacional NUMERIC DEFAULT 0,
    custo_anuncio     NUMERIC DEFAULT 0,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_empresa, ano, mes)
);

-- REGRAS DE AUTOMAÇÃO
CREATE TABLE IF NOT EXISTS public.regras_automacoes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL,
    tipo_lembrete     TEXT NOT NULL,
    cadencia_envio    INTEGER NOT NULL DEFAULT 1,
    template_mensagem TEXT,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- LEMBRETES GERADOS
CREATE TABLE IF NOT EXISTS public.lembretes_automacoes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa       UUID,
    tipo_lembrete    TEXT NOT NULL,
    data_execucao    DATE,
    disparado        BOOLEAN DEFAULT FALSE,
    mensagem         TEXT,
    data_servico     DATE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_empresa, tipo_lembrete, data_execucao)
);

-- ORDENS DE SERVIÇO E HISTÓRICO
CREATE TABLE IF NOT EXISTS public.os (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL,
    enviado          BOOLEAN DEFAULT FALSE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historico_atendimento (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL,
    data_interacao   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tipo             TEXT NOT NULL,
    mensagem         TEXT,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. CHAVES ESTRANGEIRAS (RELACIONAMENTOS)
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_id_usuario_fkey') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_id_empresa_fkey') THEN
        ALTER TABLE public.financeiro ADD CONSTRAINT financeiro_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'regras_automacoes_id_empresa_fkey') THEN
        ALTER TABLE public.regras_automacoes ADD CONSTRAINT regras_automacoes_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_id_empresa_fkey') THEN
        ALTER TABLE public.leads ADD CONSTRAINT leads_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lembretes_automacoes_id_empresa_fkey') THEN
        ALTER TABLE public.lembretes_automacoes ADD CONSTRAINT lembretes_automacoes_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendas_id_leads_fkey') THEN
        ALTER TABLE public.vendas ADD CONSTRAINT vendas_id_leads_fkey FOREIGN KEY (id_leads) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itens_vendas_id_vendas_fkey') THEN
        ALTER TABLE public.itens_vendas ADD CONSTRAINT itens_vendas_id_vendas_fkey FOREIGN KEY (id_vendas) REFERENCES public.vendas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'os_id_vendas_fkey') THEN
        ALTER TABLE public.os ADD CONSTRAINT os_id_vendas_fkey FOREIGN KEY (id_vendas) REFERENCES public.vendas(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'historico_atendimento_id_leads_fkey') THEN
        ALTER TABLE public.historico_atendimento ADD CONSTRAINT historico_atendimento_id_leads_fkey FOREIGN KEY (id_leads) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 4. FUNÇÕES (STORED PROCEDURES)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_set_data_atualizacao() RETURNS TRIGGER AS $$
BEGIN NEW.data_atualizacao = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_get_user_role() RETURNS TEXT AS $$
BEGIN RETURN (SELECT role FROM public.user_roles WHERE user_id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_criar_perfil_usuario() RETURNS TRIGGER AS $$
BEGIN INSERT INTO public.usuarios (id, email, permissao, status) VALUES (NEW.id, NEW.email, 'viewer', 'ativo'); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_configurar_regras_padrao_empresa() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.regras_automacoes (id_empresa, tipo_lembrete, cadencia_envio, template_mensagem)
    VALUES 
        (NEW.id, 'follow_up_pos_orcamento', 2, 'Olá, {nome}! Viu nossa proposta?'),
        (NEW.id, 'follow_up_pos_orcamento', 5, '{nome}, percebo que você gostou do nosso serviço, mas ainda não avançou...'),
        (NEW.id, 'pos_venda', 360, 'Olá, {nome}! Faz um ano desde sua última limpeza! Vamos agendar?');
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_get_dashboard_data(p_empresa_id UUID, p_start TIMESTAMP, p_end TIMESTAMP, p_month INT, p_year INT)
RETURNS JSON AS $$
DECLARE
    v_total_leads INT; v_faturamento NUMERIC; v_total_vendas INT;
    v_custo_anuncio NUMERIC; v_custo_operacional NUMERIC; v_meta_financeira NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_leads FROM public.leads WHERE id_empresa = p_empresa_id AND data_criacao >= p_start AND data_criacao < p_end;
    SELECT COUNT(DISTINCT v.id), COALESCE(SUM(iv.valor - COALESCE(iv.bonus, 0)), 0) INTO v_total_vendas, v_faturamento
    FROM public.vendas v JOIN public.leads l ON v.id_leads = l.id LEFT JOIN public.itens_vendas iv ON v.id = iv.id_vendas
    WHERE l.id_empresa = p_empresa_id AND v.data_venda >= p_start::date AND v.data_venda < p_end::date;
    SELECT COALESCE(custo_anuncio, 0), COALESCE(custo_operacional, 0), COALESCE(meta_financeira, 0)
    INTO v_custo_anuncio, v_custo_operacional, v_meta_financeira FROM public.financeiro WHERE id_empresa = p_empresa_id AND mes = p_month AND ano = p_year;
    RETURN json_build_object('totalLeads', v_total_leads, 'totalVendas', v_total_vendas, 'faturamento', v_faturamento, 'custoAnuncio', v_custo_anuncio, 'custoOperacional', v_custo_operacional, 'metaFaturamento', v_meta_financeira);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

CREATE TRIGGER trg_configurar_regras_empresa AFTER INSERT ON public.empresas FOR EACH ROW EXECUTE FUNCTION fn_configurar_regras_padrao_empresa();
CREATE TRIGGER trg_set_data_atualizacao_usuarios BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION fn_set_data_atualizacao();
CREATE TRIGGER trg_set_data_atualizacao_empresas BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION fn_set_data_atualizacao();
CREATE TRIGGER trg_set_data_atualizacao_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION fn_set_data_atualizacao();
CREATE TRIGGER trg_set_data_atualizacao_vendas BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION fn_set_data_atualizacao();

-- ============================================================
-- 6. POLÍTICAS DE RLS
-- ============================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios: acesso" ON public.usuarios FOR ALL USING (auth.uid() = id);
CREATE POLICY "empresas: acesso" ON public.empresas FOR ALL USING (id_usuario = auth.uid() OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "leads: acesso" ON public.leads FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid()) OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY "financeiro: acesso" ON public.financeiro FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid()) OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin');