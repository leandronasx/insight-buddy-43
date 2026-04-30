-- Drop the function if it already exists
DROP FUNCTION IF EXISTS public.fn_get_user_role();

-- Create a security definer function to get the current user's role without exposing user_roles
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  RETURN v_role;
END;
$$;
