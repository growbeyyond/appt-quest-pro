
-- Fix: Add explicit role requirements to patients table policies
-- Drop existing policies
DROP POLICY IF EXISTS "Deny anonymous access to patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view patients in their branch" ON public.patients;
DROP POLICY IF EXISTS "Staff can create patients in their branch" ON public.patients;
DROP POLICY IF EXISTS "Staff can update patients in their branch" ON public.patients;

-- Policy 1: Block all users without valid roles (strict deny)
CREATE POLICY "Block unauthorized access to patients"
ON public.patients
AS RESTRICTIVE
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'receptionist'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'receptionist'::app_role)
  )
);

-- Policy 2: Staff can view patients in their branch (requires role + branch access)
CREATE POLICY "Staff can view patients in assigned branches"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role)) AND
    can_access_branch(auth.uid(), branch_id)
  ) OR
  (
    has_role(auth.uid(), 'doctor'::app_role) AND
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = patients.id AND a.doctor_id = auth.uid()
    )
  )
);

-- Policy 3: Staff can create patients in their branch (requires role + branch access)
CREATE POLICY "Staff can create patients in assigned branches"
ON public.patients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role)) AND
    can_access_branch(auth.uid(), branch_id)
  )
);

-- Policy 4: Staff can update patients in their branch (requires role + branch access)
CREATE POLICY "Staff can update patients in assigned branches"
ON public.patients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role)) AND
    can_access_branch(auth.uid(), branch_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role)) AND
    can_access_branch(auth.uid(), branch_id)
  )
);
