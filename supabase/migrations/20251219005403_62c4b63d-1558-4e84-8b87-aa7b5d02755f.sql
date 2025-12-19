-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive INSERT policy that only allows service role (used by edge functions and triggers)
-- This prevents authenticated users from poisoning the audit trail
CREATE POLICY "Only service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add RESTRICTIVE policy to deny anonymous access
CREATE POLICY "Deny anonymous access to audit_logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);