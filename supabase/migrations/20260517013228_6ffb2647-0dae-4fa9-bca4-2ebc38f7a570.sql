
-- 1. Patient files storage: enforce {patient_id}/... path convention with branch scoping
DROP POLICY IF EXISTS "Staff can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update patient files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete patient files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete patient files" ON storage.objects;

CREATE POLICY "Staff can view patient files in their branch"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND can_access_patient(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Staff can upload patient files in their branch"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND can_access_patient(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Staff can update patient files in their branch"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND can_access_patient(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Staff can delete patient files in their branch"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND can_access_patient(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  )
);

-- 2. Reschedule requests: branch-scope via appointment
DROP POLICY IF EXISTS "Staff can view reschedule requests" ON public.reschedule_requests;
DROP POLICY IF EXISTS "Staff can update reschedule requests" ON public.reschedule_requests;

CREATE POLICY "Staff can view reschedule requests in their branch"
ON public.reschedule_requests FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = reschedule_requests.appointment_id
      AND (a.doctor_id = auth.uid() OR can_access_branch(auth.uid(), a.branch_id))
  )
);

CREATE POLICY "Staff can update reschedule requests in their branch"
ON public.reschedule_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = reschedule_requests.appointment_id
      AND can_access_branch(auth.uid(), a.branch_id)
  )
);

-- 3. Followups insert: require branch access (AND, not OR)
DROP POLICY IF EXISTS "Staff can create followups in their branch" ON public.followups;

CREATE POLICY "Staff can create followups in their branch"
ON public.followups FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR can_access_branch(auth.uid(), branch_id)
);
