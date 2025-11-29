-- Create waitlist table for managing appointment waiting lists
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  appointment_type appointment_type NOT NULL DEFAULT 'new',
  reason TEXT,
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, contacted, scheduled, cancelled
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contacted_at TIMESTAMP WITH TIME ZONE,
  scheduled_appointment_id UUID REFERENCES public.appointments(id)
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waitlist
CREATE POLICY "Staff can view waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create waitlist entries"
  ON public.waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update waitlist entries"
  ON public.waitlist
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Staff can delete waitlist entries"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_branch_date ON public.waitlist(branch_id, preferred_date);
CREATE INDEX idx_waitlist_priority ON public.waitlist(priority, created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();