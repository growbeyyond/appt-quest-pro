REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_branch(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

DELETE FROM public.user_roles a USING public.user_roles b
WHERE a.user_id=b.user_id AND a.created_at < b.created_at;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_one_role_per_user UNIQUE (user_id);

DROP POLICY IF EXISTS "Doctors and admins can create medical records" ON public.medical_records;
CREATE POLICY "Doctors and admins can create accessible medical records"
ON public.medical_records FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor')) AND public.can_access_patient(auth.uid(), patient_id));

DROP POLICY IF EXISTS "Doctors and admins can create medical history" ON public.medical_history;
CREATE POLICY "Doctors and admins can create accessible medical history"
ON public.medical_history FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor')) AND public.can_access_patient(auth.uid(), patient_id));

DROP POLICY IF EXISTS "Doctors and admins can create prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors and admins can create accessible prescriptions"
ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor')) AND public.can_access_patient(auth.uid(), patient_id));

REVOKE UPDATE ON public.invoices FROM authenticated;
GRANT UPDATE (consultation_fee, discount, tax, other_charges, total, notes, updated_at) ON public.invoices TO authenticated;