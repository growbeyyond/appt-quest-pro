-- Drop existing policies that only check branch access
DROP POLICY IF EXISTS "Admins and receptionists can view sms reminders" ON public.sms_reminders;
DROP POLICY IF EXISTS "Admins and receptionists can create sms reminders" ON public.sms_reminders;
DROP POLICY IF EXISTS "Admins and receptionists can update sms reminders" ON public.sms_reminders;

-- Recreate SELECT policy with patient access verification
CREATE POLICY "Admins and receptionists can view sms reminders"
ON public.sms_reminders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'receptionist'::app_role) AND
    can_access_patient(auth.uid(), patient_id) AND
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = sms_reminders.appointment_id AND can_access_branch(auth.uid(), a.branch_id)
    )
  )
);

-- Recreate INSERT policy with patient access verification
CREATE POLICY "Admins and receptionists can create sms reminders"
ON public.sms_reminders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'receptionist'::app_role) AND
    can_access_patient(auth.uid(), patient_id) AND
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = sms_reminders.appointment_id AND can_access_branch(auth.uid(), a.branch_id)
    )
  )
);

-- Recreate UPDATE policy with patient access verification
CREATE POLICY "Admins and receptionists can update sms reminders"
ON public.sms_reminders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'receptionist'::app_role) AND
    can_access_patient(auth.uid(), patient_id) AND
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = sms_reminders.appointment_id AND can_access_branch(auth.uid(), a.branch_id)
    )
  )
);