-- Allow admins to read all leads
CREATE POLICY "Admins can view all leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all vendas
CREATE POLICY "Admins can view all vendas"
ON public.vendas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all financeiro_mensal
CREATE POLICY "Admins can view all financeiro"
ON public.financeiro_mensal FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all servicos
CREATE POLICY "Admins can view all servicos"
ON public.servicos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));