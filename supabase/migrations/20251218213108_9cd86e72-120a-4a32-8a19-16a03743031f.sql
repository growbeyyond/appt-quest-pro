-- Create app_settings table for storing application configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read app settings
CREATE POLICY "Admins can view app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update app settings
CREATE POLICY "Admins can update app_settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role to read (for edge functions)
CREATE POLICY "Service role can read app_settings"
ON public.app_settings
FOR SELECT
TO service_role
USING (true);

-- Insert default setup key
INSERT INTO public.app_settings (key, value) 
VALUES ('setup_secret_key', 'CLINIC2024');

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();