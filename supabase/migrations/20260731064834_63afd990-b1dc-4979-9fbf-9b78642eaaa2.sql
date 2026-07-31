ALTER TABLE public.patient_vitals
  ADD CONSTRAINT patient_vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD CONSTRAINT patient_vitals_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD CONSTRAINT patient_vitals_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT patient_vitals_bp_systolic_check CHECK (bp_systolic IS NULL OR bp_systolic BETWEEN 40 AND 300),
  ADD CONSTRAINT patient_vitals_bp_diastolic_check CHECK (bp_diastolic IS NULL OR bp_diastolic BETWEEN 20 AND 200),
  ADD CONSTRAINT patient_vitals_pulse_check CHECK (pulse IS NULL OR pulse BETWEEN 20 AND 300),
  ADD CONSTRAINT patient_vitals_weight_check CHECK (weight_kg IS NULL OR weight_kg > 0),
  ADD CONSTRAINT patient_vitals_height_check CHECK (height_cm IS NULL OR height_cm > 0),
  ADD CONSTRAINT patient_vitals_spo2_check CHECK (spo2 IS NULL OR spo2 BETWEEN 0 AND 100);

ALTER TABLE public.patient_allergies
  ADD CONSTRAINT patient_allergies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD CONSTRAINT patient_allergies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT patient_allergies_severity_check CHECK (severity IN ('mild','moderate','severe'));

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
  ADD CONSTRAINT invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT invoices_amounts_check CHECK (consultation_fee >= 0 AND discount >= 0 AND tax >= 0 AND other_charges >= 0 AND total >= 0 AND amount_paid >= 0),
  ADD CONSTRAINT invoices_status_check CHECK (status IN ('unpaid','partial','paid'));
CREATE UNIQUE INDEX invoices_appointment_unique ON public.invoices(appointment_id) WHERE appointment_id IS NOT NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
  ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT payments_amount_check CHECK (amount > 0),
  ADD CONSTRAINT payments_method_check CHECK (method IN ('cash','upi','card','bank_transfer','other'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_vitals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_allergies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.patient_vitals, public.patient_allergies, public.invoices, public.payments TO service_role;