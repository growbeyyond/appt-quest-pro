
-- Fix: Separate self-access from staff-access for profiles table
-- Drop the flawed policies
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;

-- Policy 1: Block all anonymous users (strict deny)
CREATE POLICY "Block anonymous users from profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 2: Users can ONLY view their own profile (self-access)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 3: Staff with valid roles can view all profiles (needed for app functionality)
CREATE POLICY "Staff with roles can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'doctor'::app_role) OR
  has_role(auth.uid(), 'receptionist'::app_role)
);

-- Policy 4: Users can only update their own profile (already exists but recreate for clarity)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
