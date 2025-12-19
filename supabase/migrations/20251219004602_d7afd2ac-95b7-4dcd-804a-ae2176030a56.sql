-- Drop the overly permissive "Require authentication for profiles" policy
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Drop duplicate update policies (keep one)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop duplicate select policies (keep one)  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Add RESTRICTIVE policy to deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);