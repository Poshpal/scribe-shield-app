
-- 1) Restringir tipos a un área específica
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS restricted_area_id uuid REFERENCES public.areas(id);

UPDATE public.document_types
SET restricted_area_id = 'c053cdb0-364d-4c05-945b-f64775b5ab63'
WHERE code IN ('acta', 'SUB');

-- 2) Función de validación para INSERT
CREATE OR REPLACE FUNCTION public.type_allowed_in_area(_type_id uuid, _area_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.document_types
    WHERE id = _type_id
      AND restricted_area_id IS NOT NULL
      AND restricted_area_id <> _area_id
  );
$$;

-- 3) Recrear policy INSERT en documents incluyendo la restricción
DROP POLICY IF EXISTS documents_insert_capturista ON public.documents;
CREATE POLICY documents_insert_capturista
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  can_create_in_area(auth.uid(), area_id)
  AND created_by = auth.uid()
  AND type_allowed_in_area(type_id, area_id)
);

-- 4) Función para obtener el nombre del creador (bypassa RLS de profiles)
CREATE OR REPLACE FUNCTION public.get_user_display(_user_id uuid)
RETURNS TABLE(full_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name, email FROM public.profiles WHERE id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.type_allowed_in_area(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_display(uuid) TO authenticated;
