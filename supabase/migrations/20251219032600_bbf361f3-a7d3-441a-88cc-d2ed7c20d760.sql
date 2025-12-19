
-- Fix 1: Profiles table - ensure staff can view other staff profiles (needed for app coordination)
-- but only authenticated staff with valid roles can see profiles

-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a strict deny policy for anonymous users
CREATE POLICY "Deny all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'doctor'::app_role) OR 
  has_role(auth.uid(), 'receptionist'::app_role) OR
  auth.uid() = id
))
WITH CHECK (auth.uid() IS NOT NULL AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'doctor'::app_role) OR 
  has_role(auth.uid(), 'receptionist'::app_role) OR
  auth.uid() = id
));

-- Staff can view all staff profiles (needed for app functionality like doctor selection)
CREATE POLICY "Staff can view profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'doctor'::app_role) OR
  has_role(auth.uid(), 'receptionist'::app_role) OR
  auth.uid() = id
);

-- Fix 2: SMS reminders - strengthen the deny policy to explicitly block anonymous SELECT
DROP POLICY IF EXISTS "Deny anonymous access to sms_reminders" ON public.sms_reminders;

-- Create a strict deny policy that blocks ALL operations for anonymous/unauthenticated users
CREATE POLICY "Block all anonymous access to sms_reminders"
ON public.sms_reminders
AS RESTRICTIVE
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'receptionist'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'receptionist'::app_role)
  )
);
