-- Phase 2: Update RLS Policies for All Tables

-- 2.1 Patients Table
DROP POLICY IF EXISTS "Staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can create patients" ON public.patients;
DROP POLICY IF EXISTS "Staff can update patients" ON public.patients;

CREATE POLICY "Users can view patients in their branch"
ON public.patients FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id) OR
  (has_role(auth.uid(), 'doctor') AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = patients.id AND a.doctor_id = auth.uid()
  ))
);

CREATE POLICY "Staff can create patients in their branch"
ON public.patients FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can update patients in their branch"
ON public.patients FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

-- 2.2 Appointments Table
DROP POLICY IF EXISTS "Staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON public.appointments;

CREATE POLICY "Users can view appointments in their branch or as doctor"
ON public.appointments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can create appointments in their branch"
ON public.appointments FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  can_access_branch(auth.uid(), branch_id)
);

CREATE POLICY "Staff can update appointments in their branch or as doctor"
ON public.appointments FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_branch(auth.uid(), branch_id)
);

-- 2.3 Medical Records Table
DROP POLICY IF EXISTS "Staff can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Staff can create medical records" ON public.medical_records;

CREATE POLICY "Authorized users can view medical records"
ON public.medical_records FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_patient(auth.uid(), patient_id)
);

CREATE POLICY "Doctors and admins can create medical records"
ON public.medical_records FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

-- 2.4 Medical History Table
DROP POLICY IF EXISTS "Staff can view medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Staff can create medical history" ON public.medical_history;
DROP POLICY IF EXISTS "Staff can update medical history" ON public.medical_history;

CREATE POLICY "Authorized users can view medical history"
ON public.medical_history FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid() OR
  can_access_patient(auth.uid(), patient_id)
);

CREATE POLICY "Doctors and admins can create medical history"
ON public.medical_history FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors and admins can update medical history"
ON public.medical_history FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  doctor_id = auth.uid()
);