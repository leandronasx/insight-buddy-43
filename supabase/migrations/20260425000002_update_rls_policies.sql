-- Atualiza RLS de Leads
DROP POLICY IF EXISTS "leads: acesso_total_admin_ou_proprio" ON public.leads;
CREATE POLICY "leads: acesso_total_admin_ou_proprio" ON public.leads
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = leads.id_empresa AND e.id_usuario = auth.uid())
);

-- Atualiza RLS de Vendas
DROP POLICY IF EXISTS "vendas: acesso_admin_ou_dono" ON public.vendas;
CREATE POLICY "vendas: acesso_admin_ou_dono" ON public.vendas
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR
    EXISTS (SELECT 1 FROM leads l JOIN empresas e ON e.id = l.id_empresa WHERE l.id = vendas.id_leads AND e.id_usuario = auth.uid())
);

-- Atualiza RLS de Itens Vendas
DROP POLICY IF EXISTS "itens_vendas: acesso_admin_ou_dono" ON public.itens_vendas;
CREATE POLICY "itens_vendas: acesso_admin_ou_dono" ON public.itens_vendas
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR
    EXISTS (SELECT 1 FROM vendas v JOIN leads l ON l.id = v.id_leads JOIN empresas e ON e.id = l.id_empresa WHERE v.id = itens_vendas.id_vendas AND e.id_usuario = auth.uid())
);

-- Atualiza RLS de Financeiro
DROP POLICY IF EXISTS "financeiro: acesso_admin_ou_dono" ON public.financeiro;
CREATE POLICY "financeiro: acesso_admin_ou_dono" ON public.financeiro
FOR ALL USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin' OR
    EXISTS (SELECT 1 FROM empresas e WHERE e.id = financeiro.id_empresa AND e.id_usuario = auth.uid())
);
