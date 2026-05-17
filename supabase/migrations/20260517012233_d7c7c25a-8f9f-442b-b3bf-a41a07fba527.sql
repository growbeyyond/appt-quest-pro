-- Revoke execute on internal SECURITY DEFINER helpers from public roles.
-- They remain callable from RLS policies (executed as table owner) and from service role.
DO $$
DECLARE
  fn text;
BEGIN
  FOR fn IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'has_role','get_user_role','can_access_branch','can_access_patient',
        'handle_new_user','handle_new_user_role','handle_updated_at','update_updated_at_column'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END$$;