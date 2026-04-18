-- Harden user_roles INSERT policy: ensure only admins (via SECURITY DEFINER has_role) can insert,
-- and explicitly block non-admins from inserting any row (including for themselves).

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));