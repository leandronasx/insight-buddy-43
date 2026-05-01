-- Drop the original policies that cause infinite recursion
DROP POLICY IF EXISTS "empresas: acesso" ON public.empresas;
DROP POLICY IF EXISTS "leads: acesso" ON public.leads;
DROP POLICY IF EXISTS "financeiro: acesso" ON public.financeiro;

-- Recreate them using the public.fn_get_user_role() function to avoid recursion
CREATE POLICY "empresas: acesso" ON public.empresas FOR ALL USING (id_usuario = auth.uid() OR public.fn_get_user_role() = 'admin');
CREATE POLICY "leads: acesso" ON public.leads FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');
CREATE POLICY "financeiro: acesso" ON public.financeiro FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

-- Add RLS to remaining tables
ALTER TABLE public.itens_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for remaining tables with multi-tenant rules
CREATE POLICY "itens_vendas: acesso" ON public.itens_vendas FOR ALL USING (EXISTS (SELECT 1 FROM vendas v JOIN leads l ON v.id_leads = l.id JOIN empresas e ON l.id_empresa = e.id WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "regras_automacoes: acesso" ON public.regras_automacoes FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = regras_automacoes.id_empresa AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "lembretes_automacoes: acesso" ON public.lembretes_automacoes FOR ALL USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = lembretes_automacoes.id_empresa AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "vendas: acesso" ON public.vendas FOR ALL USING (EXISTS (SELECT 1 FROM leads l JOIN empresas e ON l.id_empresa = e.id WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "os: acesso" ON public.os FOR ALL USING (EXISTS (SELECT 1 FROM vendas v JOIN leads l ON v.id_leads = l.id JOIN empresas e ON l.id_empresa = e.id WHERE v.id = os.id_vendas AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "historico_atendimento: acesso" ON public.historico_atendimento FOR ALL USING (EXISTS (SELECT 1 FROM leads l JOIN empresas e ON l.id_empresa = e.id WHERE l.id = historico_atendimento.id_leads AND e.id_usuario = auth.uid()) OR public.fn_get_user_role() = 'admin');

CREATE POLICY "user_roles: select" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.fn_get_user_role() = 'admin');
