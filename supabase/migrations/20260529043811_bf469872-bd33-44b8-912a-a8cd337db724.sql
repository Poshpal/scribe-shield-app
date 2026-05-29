CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_has_admin boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN
    RAISE EXCEPTION 'Ya existe un administrador';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;