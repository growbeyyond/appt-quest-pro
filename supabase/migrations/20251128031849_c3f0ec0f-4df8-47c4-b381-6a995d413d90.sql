-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create medical_history table
CREATE TABLE public.medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  appointment_id UUID REFERENCES public.appointments(id),
  history_type TEXT NOT NULL CHECK (history_type IN ('diagnosis', 'medication', 'allergy', 'procedure', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  appointment_id UUID REFERENCES public.appointments(id),
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_items table
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity TEXT,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_templates table
CREATE TABLE public.prescription_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sms_reminders table to track sent reminders
CREATE TABLE public.sms_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_history
CREATE POLICY "Staff can view medical history"
ON public.medical_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create medical history"
ON public.medical_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update medical history"
ON public.medical_history FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for prescriptions
CREATE POLICY "Staff can view prescriptions"
ON public.prescriptions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create prescriptions"
ON public.prescriptions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update prescriptions"
ON public.prescriptions FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for prescription_items
CREATE POLICY "Staff can view prescription items"
ON public.prescription_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create prescription items"
ON public.prescription_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can delete prescription items"
ON public.prescription_items FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for prescription_templates
CREATE POLICY "Staff can view prescription templates"
ON public.prescription_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can create prescription templates"
ON public.prescription_templates FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update prescription templates"
ON public.prescription_templates FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Staff can delete prescription templates"
ON public.prescription_templates FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for sms_reminders
CREATE POLICY "Staff can view sms reminders"
ON public.sms_reminders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create sms reminders"
ON public.sms_reminders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update sms reminders"
ON public.sms_reminders FOR UPDATE
TO authenticated
USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_medical_history_updated_at
BEFORE UPDATE ON public.medical_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_medical_history_patient ON public.medical_history(patient_id);
CREATE INDEX idx_medical_history_type ON public.medical_history(history_type);
CREATE INDEX idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX idx_prescription_items_prescription ON public.prescription_items(prescription_id);
CREATE INDEX idx_sms_reminders_appointment ON public.sms_reminders(appointment_id);
CREATE INDEX idx_sms_reminders_status ON public.sms_reminders(status);