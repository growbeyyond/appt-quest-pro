-- Drop the incorrectly configured denial policy (PERMISSIVE with false blocks everyone)
DROP POLICY IF EXISTS "Deny anonymous access to sms_reminders" ON public.sms_reminders;

-- Add proper RESTRICTIVE policy to deny anonymous access
CREATE POLICY "Deny anonymous access to sms_reminders"
ON public.sms_reminders
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update SELECT policy to also require branch access for receptionists
DROP POLICY IF EXISTS "Admins and receptionists can view sms reminders" ON public.sms_reminders;

CREATE POLICY "Admins and receptionists can view sms reminders"
ON public.sms_reminders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'receptionist'::app_role) AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = sms_reminders.appointment_id
    AND can_access_branch(auth.uid(), a.branch_id)
  ))
);

-- Update INSERT policy to require branch access
DROP POLICY IF EXISTS "Admins and receptionists can create sms reminders" ON public.sms_reminders;

CREATE POLICY "Admins and receptionists can create sms reminders"
ON public.sms_reminders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'receptionist'::app_role) AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id
    AND can_access_branch(auth.uid(), a.branch_id)
  ))
);

-- Update UPDATE policy to require branch access
DROP POLICY IF EXISTS "Admins and receptionists can update sms reminders" ON public.sms_reminders;

CREATE POLICY "Admins and receptionists can update sms reminders"
ON public.sms_reminders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'receptionist'::app_role) AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = sms_reminders.appointment_id
    AND can_access_branch(auth.uid(), a.branch_id)
  ))
);