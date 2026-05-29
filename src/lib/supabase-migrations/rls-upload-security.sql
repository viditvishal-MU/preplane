-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for data upload tables — reference / documentation
--
-- This file documents the Row Level Security model for the upload tables.
-- The policies below are ALREADY APPLIED in this project via Supabase
-- migrations. They use the `public.has_role(uuid, app_role)` security definer
-- function (sourced from the user_roles table) — NOT a lookup against
-- approved_users — because approved_users.id is its own UUID and is not
-- tied to auth.uid(). The has_role() pattern is also resistant to RLS
-- recursion issues.
--
-- Read access:  any authenticated user.
-- Write access: only users with role = 'admin' in user_roles.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all entity tables
ALTER TABLE public.mentors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_source_sync_history ENABLE ROW LEVEL SECURITY;

-- ── READ: any authenticated user ────────────────────────────────────────────
CREATE POLICY "mentors_select"           ON public.mentors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "alumni_select"            ON public.alumni_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "students_select"          ON public.students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sync_history_select"      ON public.data_source_sync_history
  FOR SELECT TO authenticated USING (true);

-- ── WRITE: admins only ──────────────────────────────────────────────────────
-- mentors
CREATE POLICY "mentors_admin_insert" ON public.mentors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mentors_admin_update" ON public.mentors
  FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mentors_admin_delete" ON public.mentors
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- alumni_records
CREATE POLICY "alumni_admin_insert" ON public.alumni_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "alumni_admin_update" ON public.alumni_records
  FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "alumni_admin_delete" ON public.alumni_records
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- students
CREATE POLICY "students_admin_insert" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "students_admin_update" ON public.students
  FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "students_admin_delete" ON public.students
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- data_source_sync_history
CREATE POLICY "sync_history_admin_insert" ON public.data_source_sync_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sync_history_admin_update" ON public.data_source_sync_history
  FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "sync_history_admin_delete" ON public.data_source_sync_history
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────────
-- Note: the has_role() function definition (already present in the project):
--
-- CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
-- RETURNS boolean
-- LANGUAGE sql STABLE SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (SELECT 1 FROM public.user_roles
--                  WHERE user_id = _user_id AND role = _role);
-- $$;
-- ─────────────────────────────────────────────────────────────────────────────
