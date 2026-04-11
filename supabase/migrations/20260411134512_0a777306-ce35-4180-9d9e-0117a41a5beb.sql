
CREATE INDEX IF NOT EXISTS idx_leads_empresa_data ON public.leads (empresa_id, data_mensagem);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_data ON public.vendas (empresa_id, data_venda);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_mes ON public.financeiro_mensal (empresa_id, mes_referencia, ano_referencia);
CREATE INDEX IF NOT EXISTS idx_leads_empresa_status ON public.leads (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON public.empresas (status);
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON public.empresas (user_id);
