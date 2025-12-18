-- 2.9 Waitlist Table - Update to use secure branch access
DROP POLICY IF EXISTS "Staff can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can create waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can create waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can update waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can update waitlist entries" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can delete waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Staff can delete waitlist entries" ON public.waitlist;

CREATE POLICY "Users can view waitlist in their branch"
ON public.waitlist FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can create waitlist in their branch"
ON public.waitlist FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can update waitlist in their branch"
ON public.waitlist FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can delete waitlist in their branch"
ON public.waitlist FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

-- 2.10 Reschedule Requests Table
DROP POLICY IF EXISTS "Staff can manage reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Patients can view own reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Patients can create reschedule requests" ON public.reschedule_requests;

CREATE POLICY "Staff can view reschedule requests"
ON public.reschedule_requests FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Staff can update reschedule requests"
ON public.reschedule_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Anyone can create reschedule requests"
ON public.reschedule_requests FOR INSERT
WITH CHECK (true);

-- 2.11 Patient Portal Access Table - Secure token verification
DROP POLICY IF EXISTS "Anyone can verify portal token" ON public.patient_portal_access;
DROP POLICY IF EXISTS "Patients can view own portal access" ON public.patient_portal_access;
DROP POLICY IF EXISTS "Staff can manage portal access" ON public.patient_portal_access;

CREATE POLICY "Staff can manage portal access"
ON public.patient_portal_access FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist')
);

-- 2.12 Prescription Templates - Restrict to doctors and admins
DROP POLICY IF EXISTS "Staff can view prescription templates" ON public.prescription_templates;
DROP POLICY IF EXISTS "Staff can create prescription templates" ON public.prescription_templates;
DROP POLICY IF EXISTS "Staff can update prescription templates" ON public.prescription_templates;
DROP POLICY IF EXISTS "Staff can delete prescription templates" ON public.prescription_templates;

CREATE POLICY "Doctors and admins can view prescription templates"
ON public.prescription_templates FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors and admins can create prescription templates"
ON public.prescription_templates FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors and admins can update prescription templates"
ON public.prescription_templates FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors and admins can delete prescription templates"
ON public.prescription_templates FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

-- 2.13 Add system insert policy for audit_logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);