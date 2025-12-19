
-- Fix 1: Staff profiles exposure - restrict profile viewing
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 2: Branches visibility - restrict to staff roles only
DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.branches;

-- Fix 3: App settings - make service role policy restrictive isn't possible, drop it
DROP POLICY IF EXISTS "Service role can read app_settings" ON public.app_settings;

-- Fix 4: Prescription templates - add deny anonymous policy
CREATE POLICY "Deny anonymous access to prescription_templates"
ON public.prescription_templates
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 5: Medical history - tighten doctor access to only their appointments
DROP POLICY IF EXISTS "Authorized users can view medical history" ON public.medical_history;

CREATE POLICY "Authorized users can view medical history"
ON public.medical_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  can_access_patient(auth.uid(), patient_id)
);

-- Fix 6: Prescriptions - tighten doctor access
DROP POLICY IF EXISTS "Authorized users can view prescriptions" ON public.prescriptions;

CREATE POLICY "Authorized users can view prescriptions"
ON public.prescriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  can_access_patient(auth.uid(), patient_id)
);

-- Fix 7: Medical records - ensure consistent access pattern
DROP POLICY IF EXISTS "Authorized users can view medical records" ON public.medical_records;

CREATE POLICY "Authorized users can view medical records"
ON public.medical_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  can_access_patient(auth.uid(), patient_id)
);
