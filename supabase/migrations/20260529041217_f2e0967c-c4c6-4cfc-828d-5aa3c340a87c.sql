
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'capturista', 'supervisor', 'consulta');

-- ============ TABLAS DE CATÁLOGO ============
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PERFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Áreas adicionales accesibles (para supervisores)
CREATE TABLE public.user_area_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_id)
);

-- ============ DOCUMENTOS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL UNIQUE,
  year INT NOT NULL,
  sequence INT NOT NULL,
  type_id UUID NOT NULL REFERENCES public.document_types(id),
  area_id UUID NOT NULL REFERENCES public.areas(id),
  subject TEXT NOT NULL,
  recipient TEXT,
  sender TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, area_id, type_id, sequence)
);

CREATE INDEX idx_documents_area ON public.documents(area_id);
CREATE INDEX idx_documents_type ON public.documents(type_id);
CREATE INDEX idx_documents_year ON public.documents(year);
CREATE INDEX idx_documents_created_by ON public.documents(created_by);

-- ============ GRANTS ============
GRANT SELECT ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;

GRANT SELECT ON public.document_types TO authenticated;
GRANT ALL ON public.document_types TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.user_area_assignments TO authenticated;
GRANT ALL ON public.user_area_assignments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

-- ============ FUNCIONES DE SEGURIDAD ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_area(_user_id UUID, _area_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND area_id = _area_id)
    OR EXISTS (SELECT 1 FROM public.user_area_assignments WHERE user_id = _user_id AND area_id = _area_id)
$$;

CREATE OR REPLACE FUNCTION public.can_create_in_area(_user_id UUID, _area_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR (
      public.has_role(_user_id, 'capturista')
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND area_id = _area_id)
    )
$$;

-- ============ TRIGGER: crear perfil al registrarse ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consulta');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRIGGER: generar folio consecutivo ============
CREATE OR REPLACE FUNCTION public.generate_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_code TEXT;
  v_type_prefix TEXT;
  v_next_seq INT;
BEGIN
  IF NEW.year IS NULL THEN
    NEW.year := EXTRACT(YEAR FROM NEW.document_date)::INT;
  END IF;

  SELECT code INTO v_area_code FROM public.areas WHERE id = NEW.area_id;
  SELECT prefix INTO v_type_prefix FROM public.document_types WHERE id = NEW.type_id;

  SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_next_seq
  FROM public.documents
  WHERE year = NEW.year AND area_id = NEW.area_id AND type_id = NEW.type_id;

  NEW.sequence := v_next_seq;
  NEW.folio := v_area_code || '/' || v_type_prefix || '/' || NEW.year || '/' || LPAD(v_next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_document
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.generate_folio();

-- ============ RLS ============
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_area_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Areas
CREATE POLICY "areas_select_auth" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_admin_all" ON public.areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Document types
CREATE POLICY "doctypes_select_auth" ON public.document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "doctypes_admin_all" ON public.document_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User area assignments
CREATE POLICY "uaa_select_own_or_admin" ON public.user_area_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "uaa_admin_all" ON public.user_area_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Documents
CREATE POLICY "documents_select_area_access" ON public.documents FOR SELECT TO authenticated
  USING (public.can_access_area(auth.uid(), area_id));
CREATE POLICY "documents_insert_capturista" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.can_create_in_area(auth.uid(), area_id) AND created_by = auth.uid());
CREATE POLICY "documents_update_admin" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "documents_delete_admin" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ DATOS SEMILLA ============
INSERT INTO public.areas (code, name) VALUES
  ('VE', 'Vocalía Ejecutiva'),
  ('VS', 'Vocalía del Secretario'),
  ('VRFE', 'Vocalía del Registro Federal de Electores'),
  ('VOE', 'Vocalía de Organización Electoral'),
  ('VCEYEC', 'Vocalía de Capacitación Electoral y Educación Cívica');

INSERT INTO public.document_types (code, name, prefix) VALUES
  ('oficio', 'Oficio', 'OF'),
  ('memorando', 'Memorando', 'MEMO'),
  ('circular', 'Circular', 'CIRC'),
  ('correo', 'Correo Electrónico', 'CE'),
  ('minuta', 'Minuta', 'MIN'),
  ('acta', 'Acta Circunstanciada', 'ACTA'),
  ('oficio_comision', 'Oficio de Comisión', 'OFCOM');
