-- ============================================================
-- MIGRATION ÚNICA: Schema completo do Higi$Controle
-- Substitui todas as migrations anteriores
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            TEXT NOT NULL UNIQUE,
    senha            TEXT,
    status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    permissao        TEXT NOT NULL DEFAULT 'viewer' CHECK (permissao IN ('admin', 'manager', 'viewer')),
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.empresas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario       UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_empresa     TEXT NOT NULL,
    nome_dono        TEXT,
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

CREATE TABLE IF NOT EXISTS public.financeiro (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ano               SMALLINT NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
    mes               SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    meta_financeira   NUMERIC(15, 2) DEFAULT 0,
    custo_operacional NUMERIC(15, 2) DEFAULT 0,
    custo_anuncio     NUMERIC(15, 2) DEFAULT 0,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id_empresa, ano, mes)
);

CREATE TABLE IF NOT EXISTS public.regras_automacoes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_lembrete     TEXT NOT NULL,
    cadencia_envio    INTEGER NOT NULL DEFAULT 1 CHECK (cadencia_envio > 0),
    template_mensagem TEXT,
    data_criacao      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
    robo_pos_vendas     BOOLEAN DEFAULT FALSE,
    robo_follow_ups     BOOLEAN DEFAULT FALSE,
    robo_atendimento    BOOLEAN DEFAULT FALSE,
    robo_agendamento    BOOLEAN DEFAULT FALSE,
    qualificacao        TEXT,
    data_contato        TIMESTAMP WITH TIME ZONE,
    data_orcamento      TIMESTAMP WITH TIME ZONE,
    data_criacao        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_leads         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    data_venda       DATE NOT NULL DEFAULT CURRENT_DATE,
    data_servico     DATE,
    horario_servico  TIME WITH TIME ZONE,
    status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.itens_vendas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_vendas        UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    estofado         TEXT NOT NULL,
    valor            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bonus            NUMERIC(12, 2) DEFAULT 0,
    data_criacao     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
-- FUNCTIONS E TRIGGERS
-- ============================================================

-- Atualiza data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION public.fn_set_data_atualizacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tabelas TEXT[] := ARRAY[
        'usuarios','empresas','financeiro','regras_automacoes',
        'leads','vendas','itens_vendas','os',
        'historico_atendimento','lembretes_automacoes'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tabelas LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_data_atualizacao_%I ON public.%I;
             CREATE TRIGGER trg_set_data_atualizacao_%I
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.fn_set_data_atualizacao();',
            t, t, t, t
        );
    END LOOP;
END;
$$;

-- Cria perfil de usuário automaticamente ao signup
CREATE OR REPLACE FUNCTION public.fn_criar_perfil_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, permissao, status)
    VALUES (NEW.id, NEW.email, 'viewer', 'ativo')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_perfil_usuario ON auth.users;
CREATE TRIGGER trg_criar_perfil_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_criar_perfil_usuario();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_automacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_vendas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes_automacoes ENABLE ROW LEVEL SECURITY;

-- Limpa políticas existentes para evitar conflito
DROP POLICY IF EXISTS "usuarios: somente o proprio perfil"           ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: acesso"                             ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: proprio ou admin select"            ON public.usuarios;
DROP POLICY IF EXISTS "empresas: somente do proprio usuario"         ON public.empresas;
DROP POLICY IF EXISTS "empresas: acesso"                             ON public.empresas;
DROP POLICY IF EXISTS "empresas: select proprio ou admin"            ON public.empresas;
DROP POLICY IF EXISTS "empresas: insert proprio ou admin"            ON public.empresas;
DROP POLICY IF EXISTS "empresas: update proprio ou admin"            ON public.empresas;
DROP POLICY IF EXISTS "empresas: delete admin"                       ON public.empresas;
DROP POLICY IF EXISTS "financeiro: somente da propria empresa"       ON public.financeiro;
DROP POLICY IF EXISTS "regras_automacoes: somente da propria empresa" ON public.regras_automacoes;
DROP POLICY IF EXISTS "leads: somente da propria empresa"            ON public.leads;
DROP POLICY IF EXISTS "vendas: somente dos proprios leads"           ON public.vendas;
DROP POLICY IF EXISTS "itens_vendas: somente das proprias vendas"    ON public.itens_vendas;
DROP POLICY IF EXISTS "os: somente das proprias vendas"              ON public.os;
DROP POLICY IF EXISTS "historico_atendimento: somente dos proprios leads" ON public.historico_atendimento;
DROP POLICY IF EXISTS "lembretes_automacoes: somente dos proprios leads"  ON public.lembretes_automacoes;

-- USUARIOS: sem recursão (só auth.uid())
CREATE POLICY "usuarios: acesso"
ON public.usuarios FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- EMPRESAS: dono vê a própria; admin vê todas
CREATE POLICY "empresas: acesso"
ON public.empresas FOR ALL
USING (
    id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
    id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

-- FINANCEIRO
CREATE POLICY "financeiro: somente da propria empresa"
ON public.financeiro FOR ALL
USING (id_empresa IN (
    SELECT id FROM public.empresas WHERE id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- REGRAS_AUTOMACOES
CREATE POLICY "regras_automacoes: somente da propria empresa"
ON public.regras_automacoes FOR ALL
USING (id_empresa IN (
    SELECT id FROM public.empresas
    WHERE id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- LEADS
CREATE POLICY "leads: somente da propria empresa"
ON public.leads FOR ALL
USING (id_empresa IN (
    SELECT id FROM public.empresas
    WHERE id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- VENDAS
CREATE POLICY "vendas: somente dos proprios leads"
ON public.vendas FOR ALL
USING (id_leads IN (
    SELECT l.id FROM public.leads l
    JOIN public.empresas e ON e.id = l.id_empresa
    WHERE e.id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- ITENS_VENDAS
CREATE POLICY "itens_vendas: somente das proprias vendas"
ON public.itens_vendas FOR ALL
USING (id_vendas IN (
    SELECT v.id FROM public.vendas v
    JOIN public.leads l ON l.id = v.id_leads
    JOIN public.empresas e ON e.id = l.id_empresa
    WHERE e.id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- OS
CREATE POLICY "os: somente das proprias vendas"
ON public.os FOR ALL
USING (id_vendas IN (
    SELECT v.id FROM public.vendas v
    JOIN public.leads l ON l.id = v.id_leads
    JOIN public.empresas e ON e.id = l.id_empresa
    WHERE e.id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- HISTORICO_ATENDIMENTO
CREATE POLICY "historico_atendimento: somente dos proprios leads"
ON public.historico_atendimento FOR ALL
USING (id_leads IN (
    SELECT l.id FROM public.leads l
    JOIN public.empresas e ON e.id = l.id_empresa
    WHERE e.id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- LEMBRETES_AUTOMACOES
CREATE POLICY "lembretes_automacoes: somente dos proprios leads"
ON public.lembretes_automacoes FOR ALL
USING (id_leads IN (
    SELECT l.id FROM public.leads l
    JOIN public.empresas e ON e.id = l.id_empresa
    WHERE e.id_usuario = auth.uid()
    OR (SELECT permissao FROM public.usuarios WHERE id = auth.uid()) = 'admin'
));

-- ============================================================
-- STORAGE: bucket logos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Logos are publicly accessible"   ON storage.objects;
DROP POLICY IF EXISTS "Logos are publicly viewable"     ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logo" ON storage.objects;
DROP POLICY IF EXISTS "logos: select publico"           ON storage.objects;
DROP POLICY IF EXISTS "logos: insert autenticado"       ON storage.objects;
DROP POLICY IF EXISTS "logos: update autenticado"       ON storage.objects;
DROP POLICY IF EXISTS "logos: delete autenticado"       ON storage.objects;

CREATE POLICY "logos: select publico"
ON storage.objects FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "logos: insert autenticado"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "logos: update autenticado"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "logos: delete autenticado"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos');

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_empresas_id_usuario    ON public.empresas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_financeiro_id_empresa  ON public.financeiro(id_empresa);
CREATE INDEX IF NOT EXISTS idx_regras_id_empresa      ON public.regras_automacoes(id_empresa);
CREATE INDEX IF NOT EXISTS idx_leads_id_empresa       ON public.leads(id_empresa);
CREATE INDEX IF NOT EXISTS idx_leads_email            ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telefone         ON public.leads(telefone);
CREATE INDEX IF NOT EXISTS idx_vendas_id_leads        ON public.vendas(id_leads);
CREATE INDEX IF NOT EXISTS idx_itens_vendas_id_vendas ON public.itens_vendas(id_vendas);
CREATE INDEX IF NOT EXISTS idx_os_id_vendas           ON public.os(id_vendas);
CREATE INDEX IF NOT EXISTS idx_hist_id_leads          ON public.historico_atendimento(id_leads);
CREATE INDEX IF NOT EXISTS idx_lembretes_id_leads     ON public.lembretes_automacoes(id_leads);
CREATE INDEX IF NOT EXISTS idx_lembretes_disparado    ON public.lembretes_automacoes(disparado);




-- ============================================================
-- Mundaças em tabela leads(situacao_do_cliente, momento_funil, qualificacao)
-- ============================================================


-- Adiciona constraints de CHECK nas colunas da tabela leads

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS chk_situacao_do_cliente,
  DROP CONSTRAINT IF EXISTS chk_momento_funil,
  DROP CONSTRAINT IF EXISTS chk_qualificacao;

ALTER TABLE public.leads
  ADD CONSTRAINT chk_situacao_do_cliente
    CHECK (situacao_do_cliente IS NULL OR situacao_do_cliente IN (
      'Agendado', 'Fechado', 'Reabordar', 'Sem Interesse', 'Interesse Futuro'
    ));

ALTER TABLE public.leads
  ADD CONSTRAINT chk_momento_funil
    CHECK (momento_funil IS NULL OR momento_funil IN (
      'Pre Orçamento', 'Pos Orçamento', 'Pos Venda'
    ));

ALTER TABLE public.leads
  ADD CONSTRAINT chk_qualificacao
    CHECK (qualificacao IS NULL OR qualificacao IN (
      'Sim', 'Não'
    ));



-- ============================================================
-- FIM DO SCHEMA
-- ============================================================