-- Structured homeopathic case record
CREATE TABLE public.case_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES auth.users(id),
  case_date date NOT NULL DEFAULT CURRENT_DATE,
  case_type text NOT NULL DEFAULT 'first' CHECK (case_type IN ('first','follow_up')),
  chief_complaints text,
  complaint_onset text,
  complaint_duration text,
  intensity integer CHECK (intensity BETWEEN 0 AND 10),
  mentals text,
  emotionals text,
  physical_generals text,
  thermal_reaction text,
  appetite_desires text,
  aversions text,
  thirst text,
  sleep_dreams text,
  perspiration text,
  stool_urine text,
  menstrual_history text,
  modalities_better text,
  modalities_worse text,
  past_history text,
  family_history text,
  personal_history text,
  treatment_history text,
  constitution text,
  miasm text,
  investigations text,
  diagnosis text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_records TO authenticated;
GRANT ALL ON public.case_records TO service_role;
ALTER TABLE public.case_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to case_records" ON public.case_records AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "View accessible case records" ON public.case_records FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Clinicians create accessible case records" ON public.case_records FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'doctor'::app_role)) AND can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Clinicians update accessible case records" ON public.case_records FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR doctor_id = auth.uid())
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR doctor_id = auth.uid());

CREATE TRIGGER trg_case_records_updated_at BEFORE UPDATE ON public.case_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_case_records_patient ON public.case_records(patient_id, case_date DESC);

-- Rubrics / repertorisation notes attached to a case
CREATE TABLE public.case_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_record_id uuid NOT NULL REFERENCES public.case_records(id) ON DELETE CASCADE,
  rubric text NOT NULL,
  chapter text,
  grade integer CHECK (grade BETWEEN 1 AND 4),
  remedies text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_rubrics TO authenticated;
GRANT ALL ON public.case_rubrics TO service_role;
ALTER TABLE public.case_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to case_rubrics" ON public.case_rubrics AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "View rubrics of accessible cases" ON public.case_rubrics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.case_records c WHERE c.id = case_rubrics.case_record_id
    AND (has_role(auth.uid(),'admin'::app_role) OR c.doctor_id = auth.uid() OR can_access_patient(auth.uid(), c.patient_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.case_records c WHERE c.id = case_rubrics.case_record_id
    AND (has_role(auth.uid(),'admin'::app_role) OR c.doctor_id = auth.uid() OR can_access_patient(auth.uid(), c.patient_id))));

-- Homeopathic fields on prescriptions and items
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS case_record_id uuid REFERENCES public.case_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remedy_rationale text,
  ADD COLUMN IF NOT EXISTS follow_up_after text;

ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS potency text,
  ADD COLUMN IF NOT EXISTS repetition text,
  ADD COLUMN IF NOT EXISTS dispensing_form text;

-- Remedy response tracking across visits
CREATE TABLE public.remedy_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  case_record_id uuid REFERENCES public.case_records(id) ON DELETE SET NULL,
  assessed_on date NOT NULL DEFAULT CURRENT_DATE,
  remedy_name text NOT NULL,
  potency text,
  response text NOT NULL DEFAULT 'improving' CHECK (response IN ('improving','status_quo','aggravation','relapse','cured','remedy_changed')),
  aggravation text CHECK (aggravation IN ('none','mild','moderate','severe')),
  improvement_score integer CHECK (improvement_score BETWEEN 0 AND 10),
  action_taken text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remedy_responses TO authenticated;
GRANT ALL ON public.remedy_responses TO service_role;
ALTER TABLE public.remedy_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to remedy_responses" ON public.remedy_responses AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "View accessible remedy responses" ON public.remedy_responses FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Clinicians record remedy responses" ON public.remedy_responses FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'doctor'::app_role)) AND can_access_patient(auth.uid(), patient_id));
CREATE POLICY "Clinicians update remedy responses" ON public.remedy_responses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR recorded_by = auth.uid())
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR recorded_by = auth.uid());

CREATE INDEX idx_remedy_responses_patient ON public.remedy_responses(patient_id, assessed_on DESC);