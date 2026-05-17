-- 1. Rotate setup key
UPDATE public.app_settings SET value='CLINIC2026', updated_at=now() WHERE key='setup_secret_key';
INSERT INTO public.app_settings (key, value)
SELECT 'setup_secret_key','CLINIC2026'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key='setup_secret_key');

-- 2. patient_vitals
CREATE TABLE public.patient_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  appointment_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  bp_systolic integer,
  bp_diastolic integer,
  pulse integer,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(5,2),
  temperature_c numeric(4,1),
  spo2 integer,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_vitals_patient ON public.patient_vitals(patient_id, recorded_at DESC);
ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon vitals" ON public.patient_vitals AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View vitals" ON public.patient_vitals FOR SELECT USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Insert vitals" ON public.patient_vitals FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Update vitals" ON public.patient_vitals FOR UPDATE USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Delete vitals" ON public.patient_vitals FOR DELETE USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));

-- 3. patient_allergies
CREATE TABLE public.patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  allergen text NOT NULL,
  severity text DEFAULT 'mild',
  reaction text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_allergies_patient ON public.patient_allergies(patient_id);
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon allergies" ON public.patient_allergies AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View allergies" ON public.patient_allergies FOR SELECT USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Insert allergies" ON public.patient_allergies FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Update allergies" ON public.patient_allergies FOR UPDATE USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Delete allergies" ON public.patient_allergies FOR DELETE USING (has_role(auth.uid(),'admin') OR can_access_patient(auth.uid(), patient_id));

CREATE TRIGGER trg_allergies_updated_at BEFORE UPDATE ON public.patient_allergies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  consultation_fee numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  other_charges numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX idx_invoices_branch ON public.invoices(branch_id);
CREATE INDEX idx_invoices_appointment ON public.invoices(appointment_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon invoices" ON public.invoices AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(),'admin') OR can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Insert invoices" ON public.invoices FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Update invoices" ON public.invoices FOR UPDATE USING (has_role(auth.uid(),'admin') OR can_access_branch(auth.uid(), branch_id));
CREATE POLICY "Delete invoices" ON public.invoices FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon payments" ON public.payments AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "View payments" ON public.payments FOR SELECT USING (
  has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND can_access_branch(auth.uid(), i.branch_id))
);
CREATE POLICY "Insert payments" ON public.payments FOR INSERT WITH CHECK (
  has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND can_access_branch(auth.uid(), i.branch_id))
);
CREATE POLICY "Update payments" ON public.payments FOR UPDATE USING (
  has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND can_access_branch(auth.uid(), i.branch_id))
);
CREATE POLICY "Delete payments" ON public.payments FOR DELETE USING (has_role(auth.uid(),'admin'));

-- 6. Auto-update invoice amount_paid & status when payments change
CREATE OR REPLACE FUNCTION public.recalc_invoice_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_invoice_id uuid;
  v_paid numeric;
  v_total numeric;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice_id;
  SELECT total INTO v_total FROM public.invoices WHERE id = v_invoice_id;
  UPDATE public.invoices SET
    amount_paid = v_paid,
    status = CASE WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
                  WHEN v_paid > 0 THEN 'partial'
                  ELSE 'unpaid' END,
    updated_at = now()
  WHERE id = v_invoice_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_status();

GRANT EXECUTE ON FUNCTION public.recalc_invoice_status() TO authenticated;