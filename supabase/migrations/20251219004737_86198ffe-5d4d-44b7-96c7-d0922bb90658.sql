-- Drop the overly permissive authentication policy
DROP POLICY IF EXISTS "Require authentication for medical_history" ON public.medical_history;

-- Add proper RESTRICTIVE policy to deny anonymous access
CREATE POLICY "Deny anonymous access to medical_history"
ON public.medical_history
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);