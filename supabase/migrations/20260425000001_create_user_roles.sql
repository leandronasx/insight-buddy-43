CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
    UNIQUE (user_id)
);

-- Migrar dados de usuarios para user_roles (como admin ou manager ou viewer dependendo do que tem)
INSERT INTO public.user_roles (user_id, role)
SELECT id,
       CASE WHEN permissao IN ('admin', 'manager', 'viewer') THEN permissao ELSE 'viewer' END
FROM public.usuarios
ON CONFLICT (user_id) DO NOTHING;

-- Policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT USING (
    user_id = auth.uid()
);
