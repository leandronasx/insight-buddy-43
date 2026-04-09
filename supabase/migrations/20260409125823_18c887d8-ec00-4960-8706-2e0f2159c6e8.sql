
-- 1. Add self-read policy on user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Add explicit UPDATE policy for admins on user_roles
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix empresas policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can create their own empresa" ON public.empresas;
CREATE POLICY "Users can create their own empresa"
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own empresa" ON public.empresas;
CREATE POLICY "Users can update their own empresa"
  ON public.empresas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own empresa" ON public.empresas;
CREATE POLICY "Users can view their own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Fix financeiro_mensal policies
DROP POLICY IF EXISTS "Users can create financeiro for their empresa" ON public.financeiro_mensal;
CREATE POLICY "Users can create financeiro for their empresa"
  ON public.financeiro_mensal FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete financeiro of their empresa" ON public.financeiro_mensal;
CREATE POLICY "Users can delete financeiro of their empresa"
  ON public.financeiro_mensal FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update financeiro of their empresa" ON public.financeiro_mensal;
CREATE POLICY "Users can update financeiro of their empresa"
  ON public.financeiro_mensal FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view financeiro of their empresa" ON public.financeiro_mensal;
CREATE POLICY "Users can view financeiro of their empresa"
  ON public.financeiro_mensal FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

-- 5. Fix leads policies
DROP POLICY IF EXISTS "Users can create leads for their empresa" ON public.leads;
CREATE POLICY "Users can create leads for their empresa"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete leads of their empresa" ON public.leads;
CREATE POLICY "Users can delete leads of their empresa"
  ON public.leads FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update leads of their empresa" ON public.leads;
CREATE POLICY "Users can update leads of their empresa"
  ON public.leads FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view leads of their empresa" ON public.leads;
CREATE POLICY "Users can view leads of their empresa"
  ON public.leads FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

-- 6. Fix vendas policies
DROP POLICY IF EXISTS "Users can create vendas for their empresa" ON public.vendas;
CREATE POLICY "Users can create vendas for their empresa"
  ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete vendas of their empresa" ON public.vendas;
CREATE POLICY "Users can delete vendas of their empresa"
  ON public.vendas FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update vendas of their empresa" ON public.vendas;
CREATE POLICY "Users can update vendas of their empresa"
  ON public.vendas FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view vendas of their empresa" ON public.vendas;
CREATE POLICY "Users can view vendas of their empresa"
  ON public.vendas FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

-- 7. Fix servicos policies
DROP POLICY IF EXISTS "Users can create servicos for their empresa" ON public.servicos;
CREATE POLICY "Users can create servicos for their empresa"
  ON public.servicos FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete servicos of their empresa" ON public.servicos;
CREATE POLICY "Users can delete servicos of their empresa"
  ON public.servicos FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update servicos of their empresa" ON public.servicos;
CREATE POLICY "Users can update servicos of their empresa"
  ON public.servicos FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view servicos of their empresa" ON public.servicos;
CREATE POLICY "Users can view servicos of their empresa"
  ON public.servicos FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid()));
