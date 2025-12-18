-- 1. Deny anonymous access to patients table
CREATE POLICY "Deny anonymous access to patients"
ON public.patients
FOR ALL
TO anon
USING (false);

-- 2. Deny anonymous access to medical_history table
CREATE POLICY "Deny anonymous access to medical_history"
ON public.medical_history
FOR ALL
TO anon
USING (false);

-- 3. Deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 4. Drop the overly permissive reschedule_requests INSERT policy and create a proper one
DROP POLICY IF EXISTS "Anyone can create reschedule requests" ON public.reschedule_requests;

CREATE POLICY "Authenticated users can create reschedule requests"
ON public.reschedule_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Make patient-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'patient-files';