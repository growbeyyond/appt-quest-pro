DROP POLICY IF EXISTS "Doctors can create prescriptions" ON public.prescriptions;

DROP POLICY IF EXISTS "Doctors can create prescription items" ON public.prescription_items;
CREATE POLICY "Doctors can create items on accessible prescriptions"
ON public.prescription_items FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'doctor'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR p.doctor_id = auth.uid() OR can_access_patient(auth.uid(), p.patient_id))
  )
);

DROP POLICY IF EXISTS "Doctors can update prescription items" ON public.prescription_items;
CREATE POLICY "Doctors can update items on accessible prescriptions"
ON public.prescription_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR p.doctor_id = auth.uid() OR can_access_patient(auth.uid(), p.patient_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR p.doctor_id = auth.uid() OR can_access_patient(auth.uid(), p.patient_id))
  )
);

DROP POLICY IF EXISTS "Doctors can delete prescription items" ON public.prescription_items;
CREATE POLICY "Doctors can delete items on accessible prescriptions"
ON public.prescription_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_items.prescription_id
      AND (has_role(auth.uid(), 'admin'::app_role) OR p.doctor_id = auth.uid() OR can_access_patient(auth.uid(), p.patient_id))
  )
);