-- ============================================================
-- HIGI$CONTROLE - SCHEMA CONSOLIDADO (Tabelas, Funções, Triggers e RLS)
-- Data: 27/04/2026
-- Gerado via Dump de Estrutura Real
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ESTRUTURA DE TABELAS
-- ============================================================

-- USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY, -- Referencia auth.users
    email            TEXT NOT NULL UNIQUE,
    senha            TEXT,
    status           TEXT NOT NULL DEFAULT 'ativo'::text,
    permissao        TEXT NOT NULL DEFAULT 'viewer'::text,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario       UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_empresa     TEXT NOT NULL,
    nome_dono        TEXT,
    cnpj_cpf         TEXT UNIQUE,
    endereco         TEXT,
    telefone         TEXT,
    logo_url         TEXT,
    cor_primaria     TEXT,
    cor_secundaria   TEXT,
    data_inicio      DATE,
    data_termino     DATE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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

-- VENDAS
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

-- ITENS VENDAS
CREATE TABLE IF NOT EXISTS public.itens_vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    estofado         TEXT NOT NULL,
    valor            NUMERIC NOT NULL DEFAULT 0,
    bonus            NUMERIC DEFAULT 0,
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

-- REGRAS AUTOMACOES
CREATE TABLE IF NOT EXISTS public.regras_automacoes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_lembrete     TEXT NOT NULL,
    cadencia_envio    INTEGER NOT NULL DEFAULT 1,
    template_mensagem TEXT,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- HISTORICO E LEMBRETES
CREATE TABLE IF NOT EXISTS public.os (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    enviado          BOOLEAN DEFAULT FALSE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.historico_atendimento (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    data_interacao   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tipo             TEXT NOT NULL,
    mensagem         TEXT,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lembretes_automacoes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tipo_lembrete    TEXT NOT NULL,
    data_execucao    TIMESTAMP WITH TIME ZONE,
    disparado        BOOLEAN DEFAULT FALSE,
    mensagem         TEXT,
    data_servico     DATE,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. FUNÇÕES (STORED PROCEDURES)
-- ============================================================

-- Função de Timestamp Automático
CREATE OR REPLACE FUNCTION public.fn_set_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função de Criação de Perfil (Auth Trigger)
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, permissao, status)
    VALUES (NEW.id, NEW.email, 'viewer', 'ativo')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função Mestre: Configuração de Cadência de 25 Dias
CREATE OR REPLACE FUNCTION public.fn_configurar_regras_padrao_empresa()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.regras_automacoes (id_empresa, tipo_lembrete, cadencia_envio, template_mensagem)
    VALUES 
        -- PÓS ORÇAMENTO
        (NEW.id, 'follow_up_pos_orcamento', 2, 'Olá, {nome}! Espero que esteja tudo bem. Conversamos alguns dias atrás, você conseguiu analisar a nossa proposta...'),
        (NEW.id, 'follow_up_pos_orcamento', 5, '{nome}, percebo que você gostou do nosso serviço, mas ainda não avançou...'),
        (NEW.id, 'follow_up_pos_orcamento', 8, '{nome}, gostaria de entender o que faltou no nosso orçamento para você tomar a decisão...'),
        (NEW.id, 'follow_up_pos_orcamento', 23, '{nome}, como não tivemos retorno, vamos encerrar seu atendimento por agora.'),
        -- PRÉ ORÇAMENTO
        (NEW.id, 'follow_up_pre_orcamento', 1, '{nome} olá, vi que solicitou um orçamento. Pode enviar fotos do estofado?'),
        -- AGENDAMENTO E PÓS-VENDA
        (NEW.id, 'lembrete_agendamento', 1, 'Olá, {nome}, é AMANHÃ! 🚀 Passando para confirmar seu serviço.'),
        (NEW.id, 'pos_venda', 2, 'Olá, {nome}! Como avalia o serviço de higienização da {nome_empresa}?'),
        (NEW.id, 'pos_venda', 360, 'Olá, {nome}! Faz um ano desde sua última limpeza! Recomendamos uma nova higienização completa.');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Gatilho para configurar regras automáticas ao criar empresa
CREATE TRIGGER trg_configurar_regras_empresa
    AFTER INSERT ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.fn_configurar_regras_padrao_empresa();

-- Gatilhos para atualizar data_atualizacao
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
        EXECUTE format('CREATE TRIGGER trg_set_data_atualizacao_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION fn_set_data_atualizacao()', t, t);
    END LOOP;
END;
$$;

-- ============================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================================

-- Habilitar RLS em todas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Leads: Admin vê tudo, Dono vê os seus
CREATE POLICY "leads: acesso_total_admin_ou_proprio" ON public.leads 
FOR ALL USING (
    (SELECT permissao FROM usuarios WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid())
);

-- Vendas: Acesso condicionado
CREATE POLICY "vendas: acesso_admin_ou_dono" ON public.vendas 
FOR ALL USING (
    (SELECT permissao FROM usuarios WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM leads l JOIN empresas e ON e.id = l.id_empresa WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid())
);

-- Itens Vendas: Acesso condicionado
CREATE POLICY "itens_vendas: acesso_admin_ou_dono" ON public.itens_vendas 
FOR ALL USING (
    (SELECT permissao FROM usuarios WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM vendas v JOIN leads l ON l.id = v.id_leads JOIN empresas e ON e.id = l.id_empresa WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid())
);

-- Financeiro: Acesso condicionado
CREATE POLICY "financeiro: acesso_admin_ou_dono" ON public.financeiro 
FOR ALL USING (
    (SELECT permissao FROM usuarios WHERE id = auth.uid()) = 'admin' OR 
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid())
);