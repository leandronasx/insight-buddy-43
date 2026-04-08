
-- Drop and recreate foreign keys with ON DELETE CASCADE

-- financeiro_mensal -> empresas
ALTER TABLE public.financeiro_mensal DROP CONSTRAINT IF EXISTS financeiro_mensal_empresa_id_fkey;
ALTER TABLE public.financeiro_mensal ADD CONSTRAINT financeiro_mensal_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

-- leads -> empresas
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_empresa_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

-- vendas -> empresas
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_empresa_id_fkey;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

-- vendas -> leads
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_lead_id_fkey;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- servicos -> empresas
ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_empresa_id_fkey;
ALTER TABLE public.servicos ADD CONSTRAINT servicos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;

-- servicos -> leads
ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_lead_id_fkey;
ALTER TABLE public.servicos ADD CONSTRAINT servicos_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- servicos -> vendas
ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_venda_id_fkey;
ALTER TABLE public.servicos ADD CONSTRAINT servicos_venda_id_fkey
  FOREIGN KEY (venda_id) REFERENCES public.vendas(id) ON DELETE SET NULL;
