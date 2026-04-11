
-- Drop the existing INSERT policy that uses has_role (which could be bootstrapped)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Recreate with a direct subquery check (avoids relying on has_role for the same table)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);
