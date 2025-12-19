-- Drop the overly permissive authentication policy that allows ANY authenticated user to see ALL patients
DROP POLICY IF EXISTS "Require authentication for patients" ON public.patients;

-- Add RESTRICTIVE policy to deny anonymous access (the existing branch-based SELECT policy handles authorized access)
CREATE POLICY "Deny anonymous access to patients"
ON public.patients
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);