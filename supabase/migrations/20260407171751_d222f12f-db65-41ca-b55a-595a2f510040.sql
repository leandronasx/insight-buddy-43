
-- Create enum types
CREATE TYPE public.lead_origem AS ENUM ('Tráfego', 'Orgânico', 'Indicação');
CREATE TYPE public.lead_status AS ENUM ('Agendado', 'Sem Interesse', 'Fechado', 'Reabordar');
CREATE TYPE public.tipo_servico AS ENUM ('higienização', 'impermeabilização', 'higienização e impermeabilização');
CREATE TYPE public.empresa_status AS ENUM ('ativo', 'inativo');

-- Empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_nome TEXT NOT NULL,
  status empresa_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own empresa" ON public.empresas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own empresa" ON public.empresas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own empresa" ON public.empresas FOR UPDATE USING (auth.uid() = user_id);

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_lead TEXT NOT NULL,
  telefone TEXT,
  origem lead_origem NOT NULL DEFAULT 'Tráfego',
  status lead_status NOT NULL DEFAULT 'Agendado',
  data_mensagem DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads of their empresa" ON public.leads FOR SELECT USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create leads for their empresa" ON public.leads FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update leads of their empresa" ON public.leads FOR UPDATE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete leads of their empresa" ON public.leads FOR DELETE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);

-- Vendas table
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  valor_cheio NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendas of their empresa" ON public.vendas FOR SELECT USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create vendas for their empresa" ON public.vendas FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update vendas of their empresa" ON public.vendas FOR UPDATE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete vendas of their empresa" ON public.vendas FOR DELETE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);

-- Servicos table
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  estofado TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo_servico tipo_servico NOT NULL DEFAULT 'higienização',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view servicos of their empresa" ON public.servicos FOR SELECT USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create servicos for their empresa" ON public.servicos FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update servicos of their empresa" ON public.servicos FOR UPDATE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete servicos of their empresa" ON public.servicos FOR DELETE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);

-- Financeiro Mensal table
CREATE TABLE public.financeiro_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL CHECK (ano_referencia > 2020),
  investimento_trafego NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_operacional NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_faturamento NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, mes_referencia, ano_referencia)
);

ALTER TABLE public.financeiro_mensal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financeiro of their empresa" ON public.financeiro_mensal FOR SELECT USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create financeiro for their empresa" ON public.financeiro_mensal FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update financeiro of their empresa" ON public.financeiro_mensal FOR UPDATE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete financeiro of their empresa" ON public.financeiro_mensal FOR DELETE USING (
  empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financeiro_updated_at BEFORE UPDATE ON public.financeiro_mensal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create empresa on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.empresas (user_id, empresa_nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'empresa_nome', 'Minha Empresa'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
