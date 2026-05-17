-- 1) Patient files storage: drop broad authenticated policies
DROP POLICY IF EXISTS "Authenticated users can read patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient files" ON storage.objects;

-- Ensure staff DELETE policy exists (parity with select/update/upload)
DROP POLICY IF EXISTS "Staff can delete patient files" ON storage.objects;
CREATE POLICY "Staff can delete patient files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'doctor'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  )
);

-- 2) audit_logs: remove permissive INSERT policy. Service role bypasses RLS.
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON public.audit_logs;

-- 3) app_settings: add admin INSERT and DELETE policies
CREATE POLICY "Admins can insert app_settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete app_settings"
ON public.app_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Realtime: restrict subscriptions to authenticated staff
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can receive realtime messages" ON realtime.messages;
CREATE POLICY "Staff can receive realtime messages"
ON realtime.messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);