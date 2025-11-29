-- Assign admin role to the first user (you can change the email to match your admin user)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'gmt@growbeyyond.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign receptionist role to other existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'receptionist'::app_role
FROM auth.users
WHERE email != 'gmt@growbeyyond.com'
  AND id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a trigger function to automatically assign receptionist role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically assign receptionist role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'receptionist'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after profile creation
CREATE TRIGGER on_user_role_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;