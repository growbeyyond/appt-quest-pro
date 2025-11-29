-- Create patient portal access tracking
CREATE TABLE IF NOT EXISTS public.patient_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_token TEXT UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(patient_id)
);

-- Enable RLS
ALTER TABLE public.patient_portal_access ENABLE ROW LEVEL SECURITY;

-- Patients can view their own portal access
CREATE POLICY "Patients can view own portal access"
ON public.patient_portal_access
FOR SELECT
USING (true);

-- Staff can manage patient portal access
CREATE POLICY "Staff can manage portal access"
ON public.patient_portal_access
FOR ALL
USING (true);

-- Create reschedule requests table
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requested_date DATE,
  requested_time TIME,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Patients can view their own requests
CREATE POLICY "Patients can view own reschedule requests"
ON public.reschedule_requests
FOR SELECT
USING (true);

-- Patients can create reschedule requests
CREATE POLICY "Patients can create reschedule requests"
ON public.reschedule_requests
FOR INSERT
WITH CHECK (true);

-- Staff can manage all reschedule requests
CREATE POLICY "Staff can manage reschedule requests"
ON public.reschedule_requests
FOR ALL
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_reschedule_requests_updated_at
BEFORE UPDATE ON public.reschedule_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();