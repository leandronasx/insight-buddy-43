-- 1. Criar o bucket "logos" garantindo a idempotência
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Habilitar RLS nas tabelas do storage (já habilitado por padrão em novos projetos, mas por garantia:)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- Removido: o RLS ja vem habilitado por padrao e causa erro de ownership no Supabase

-- 3. Remover políticas antigas para evitar conflitos se o script rodar novamente
DROP POLICY IF EXISTS "Logos públicas para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Usuários inserem suas próprias logos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários atualizam suas próprias logos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários excluem suas próprias logos" ON storage.objects;

-- 4. Criar Política de Leitura Pública
-- Como o bucket é configurado como public = true, todos podem ler. Explicitamente permitindo:
CREATE POLICY "Logos públicas para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- 5. Criar Políticas de Escrita Segura (Apenas donos ou admins)
-- A lógica verifica se o UUID do diretório da imagem corresponde ao ID do usuário logado (auth.uid()), ou se o usuário é um Admin através da function criada.
CREATE POLICY "Usuários inserem suas próprias logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND (
        (string_to_array(name, '/'))[1] = auth.uid()::text
        OR public.fn_get_user_role() = 'admin'
    )
);

CREATE POLICY "Usuários atualizam suas próprias logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'logos' AND (
        (string_to_array(name, '/'))[1] = auth.uid()::text
        OR public.fn_get_user_role() = 'admin'
    )
);

CREATE POLICY "Usuários excluem suas próprias logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'logos' AND (
        (string_to_array(name, '/'))[1] = auth.uid()::text
        OR public.fn_get_user_role() = 'admin'
    )
);
