-- ============================================================
-- 1. CONFIGURAÇÕES INICIAIS E EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. ESTRUTURA DE TABELAS (ORDEM DE DEPENDÊNCIA)
-- ============================================================

-- USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY, -- UID do Auth.Users
    email            TEXT NOT NULL UNIQUE,
    senha            TEXT,
    status           TEXT NOT NULL DEFAULT 'ativo'::text,
    permissao        TEXT NOT NULL DEFAULT 'viewer'::text,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- NOVA TABELA: ROLES (Identificada no dump de políticas)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    role             TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario       UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_empresa     TEXT NOT NULL,
    nome_dono        TEXT,
    telefone         TEXT,
    cnpj_cpf         TEXT UNIQUE,
    endereco         TEXT,
    logo_url         TEXT,
    cor_primaria     TEXT,
    cor_secundaria   TEXT,
    data_inicio      DATE,
    data_termino     DATE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- FINANCEIRO
CREATE TABLE IF NOT EXISTS public.financeiro (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ano               SMALLINT NOT NULL,
    mes               SMALLINT NOT NULL,
    meta_financeira   NUMERIC DEFAULT 0,
    custo_operacional NUMERIC DEFAULT 0,
    custo_anuncio     NUMERIC DEFAULT 0,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_empresa, ano, mes)
);

-- LEADS
CREATE TABLE IF NOT EXISTS public.leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
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

-- VENDAS E ITENS
CREATE TABLE IF NOT EXISTS public.vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    data_venda       DATE NOT NULL DEFAULT CURRENT_DATE,
    data_servico     DATE,
    horario_servico  TIME WITH TIME ZONE,
    status           TEXT NOT NULL DEFAULT 'pendente'::text,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.itens_vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    estofado         TEXT NOT NULL,
    valor            NUMERIC NOT NULL DEFAULT 0,
    bonus            NUMERIC DEFAULT 0,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AUTOMAÇÕES
CREATE TABLE IF NOT EXISTS public.regras_automacoes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_lembrete     TEXT NOT NULL,
    cadencia_envio    INTEGER NOT NULL DEFAULT 1,
    template_mensagem TEXT,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lembretes_automacoes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tipo_lembrete    TEXT NOT NULL,
    data_execucao    TIMESTAMP WITH TIME ZONE,
    disparado        BOOLEAN DEFAULT FALSE,
    mensagem         TEXT,
    data_servico     DATE,
    id_empresa       UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. FUNÇÕES E TRIGGERS
-- ============================================================

-- Atualização automática de Timestamp
CREATE OR REPLACE FUNCTION public.fn_set_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cadastro Automático de Regras (Cadência 25 dias)
CREATE OR REPLACE FUNCTION public.fn_configurar_regras_padrao_empresa()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.regras_automacoes (id_empresa, tipo_lembrete, cadencia_envio, template_mensagem)
    VALUES 
        (NEW.id, 'follow_up_pos_orcamento', 2, 'Olá, {nome}! Espero que esteja tudo bem...'),
        (NEW.id, 'follow_up_pos_orcamento', 23, '{nome}, como não tivemos retorno, vamos encerrar seu atendimento...'),
        (NEW.id, 'pos_venda', 360, 'Olá, {nome}! Faz um ano desde sua última limpeza!');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vinculação de Triggers
DROP TRIGGER IF EXISTS trg_configurar_regras_empresa ON public.empresas;
CREATE TRIGGER trg_configurar_regras_empresa
    AFTER INSERT ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.fn_configurar_regras_padrao_empresa();

-- ============================================================
-- 4. POLÍTICAS DE RLS (BASEADAS NO DUMP ATUAL)
-- ============================================================

-- Habilitar RLS em todas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes_automacoes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS GERAIS (Admin ou Próprio)
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "leads: acesso_total_admin_ou_proprio" ON public.leads 
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid())
);

CREATE POLICY "vendas: acesso_admin_ou_dono" ON public.vendas 
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM leads l JOIN empresas e ON e.id = l.id_empresa WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid())
);

CREATE POLICY "itens_vendas: acesso_admin_ou_dono" ON public.itens_vendas 
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM vendas v JOIN leads l ON l.id = v.id_leads JOIN empresas e ON e.id = l.id_empresa WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid())
);

CREATE POLICY "financeiro: acesso_admin_ou_dono" ON public.financeiro 
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid())
);

CREATE POLICY "lembretes_automacoes: acesso" ON public.lembretes_automacoes 
FOR ALL USING (
    (SELECT permissao FROM usuarios WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = lembretes_automacoes.id_empresa AND e.id_usuario = auth.uid())
);

CREATE POLICY "os: somente das proprias vendas" ON public.os FOR ALL 
USING (id_vendas IN (SELECT v.id FROM vendas v JOIN leads l ON l.id = v.id_leads JOIN empresas e ON e.id = l.id_empresa WHERE e.id_usuario = auth.uid()));

CREATE POLICY "historico_atendimento: somente dos proprios leads" ON public.historico_atendimento FOR ALL 
USING (id_leads IN (SELECT l.id FROM leads l JOIN empresas e ON e.id = l.id_empresa WHERE e.id_usuario = auth.uid()));