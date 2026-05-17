GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;