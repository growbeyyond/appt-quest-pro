-- 2.5 Prescriptions Table
DROP POLICY IF EXISTS "Staff can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can update prescriptions" ON public.prescriptions;

CREATE POLICY "Authorized users can view prescriptions"
ON public.prescriptions FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_patient(auth.uid(), patient_id)
);

CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors can update their prescriptions"
ON public.prescriptions FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid()
);

-- 2.6 Prescription Items Table
DROP POLICY IF EXISTS "Staff can view prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Staff can create prescription items" ON public.prescription_items;
DROP POLICY IF EXISTS "Staff can delete prescription items" ON public.prescription_items;

CREATE POLICY "Users can view prescription items for accessible prescriptions"
ON public.prescription_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
    AND (
      has_role(auth.uid(), 'admin') OR
      p.doctor_id = auth.uid() OR
      can_access_patient(auth.uid(), p.patient_id)
    )
  )
);

CREATE POLICY "Doctors can create prescription items"
ON public.prescription_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors can delete prescription items"
ON public.prescription_items FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
    AND p.doctor_id = auth.uid()
  )
);

-- 2.7 Followups Table
DROP POLICY IF EXISTS "Staff can view followups" ON public.followups;
DROP POLICY IF EXISTS "Staff can create followups" ON public.followups;
DROP POLICY IF EXISTS "Staff can update followups" ON public.followups;

CREATE POLICY "Users can view followups in their branch or as doctor"
ON public.followups FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can create followups in their branch"
ON public.followups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can update followups in their branch or as doctor"
ON public.followups FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_branch(auth.uid(), branch_id)
);

-- 2.8 SMS Reminders Table
DROP POLICY IF EXISTS "Staff can view sms reminders" ON public.sms_reminders;
DROP POLICY IF EXISTS "System can create sms reminders" ON public.sms_reminders;
DROP POLICY IF EXISTS "System can update sms reminders" ON public.sms_reminders;

CREATE POLICY "Admins and receptionists can view sms reminders"
ON public.sms_reminders FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Admins and receptionists can create sms reminders"
ON public.sms_reminders FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist')
);

CREATE POLICY "Admins and receptionists can update sms reminders"
ON public.sms_reminders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'receptionist')
);