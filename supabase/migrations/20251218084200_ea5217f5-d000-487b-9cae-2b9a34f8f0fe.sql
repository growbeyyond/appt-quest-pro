-- Phase 1: Create Branch-User Assignment Table
CREATE TABLE IF NOT EXISTS public.user_branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for user_branch_assignments
CREATE POLICY "Admins can manage branch assignments"
ON public.user_branch_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own branch assignments"
ON public.user_branch_assignments FOR SELECT
USING (auth.uid() = user_id);

-- Phase 1.2: Create Security Helper Functions

-- Check if user can access a specific branch
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.user_branch_assignments
      WHERE user_id = _user_id AND branch_id = _branch_id
    )
$$;

-- Check if user can access a patient (via branch assignment or as assigned doctor)
CREATE OR REPLACE FUNCTION public.can_access_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.user_branch_assignments uba ON p.branch_id = uba.branch_id
      WHERE p.id = _patient_id AND uba.user_id = _user_id
    ) OR
    (has_role(_user_id, 'doctor') AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = _patient_id AND a.doctor_id = _user_id
    ))
$$;