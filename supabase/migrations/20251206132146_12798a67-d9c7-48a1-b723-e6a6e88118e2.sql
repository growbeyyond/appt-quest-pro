-- Continue fixing RLS policies - Part 2

-- 11. Update patient_portal_access table policies
DROP POLICY IF EXISTS "Staff can manage portal access" ON patient_portal_access;
DROP POLICY IF EXISTS "Staff can view portal access" ON patient_portal_access;
DROP POLICY IF EXISTS "Staff can create portal access" ON patient_portal_access;
DROP POLICY IF EXISTS "Staff can update portal access" ON patient_portal_access;
DROP POLICY IF EXISTS "Anyone can verify portal token" ON patient_portal_access;

CREATE POLICY "Staff can manage portal access" ON patient_portal_access
FOR ALL USING (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow anonymous token verification for patient portal
CREATE POLICY "Anyone can verify portal token" ON patient_portal_access
FOR SELECT USING (login_token IS NOT NULL);

-- 12. Update waitlist table policies
DROP POLICY IF EXISTS "Staff can view waitlist" ON waitlist;
DROP POLICY IF EXISTS "Staff can create waitlist" ON waitlist;
DROP POLICY IF EXISTS "Staff can update waitlist" ON waitlist;
DROP POLICY IF EXISTS "Staff can delete waitlist" ON waitlist;

CREATE POLICY "Staff can view waitlist" ON waitlist
FOR SELECT USING (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'doctor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can create waitlist" ON waitlist
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can update waitlist" ON waitlist
FOR UPDATE USING (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can delete waitlist" ON waitlist
FOR DELETE USING (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- 13. Update branches table policies
DROP POLICY IF EXISTS "Staff can view branches" ON branches;
DROP POLICY IF EXISTS "Admin can manage branches" ON branches;
DROP POLICY IF EXISTS "Admin can create branches" ON branches;
DROP POLICY IF EXISTS "Admin can update branches" ON branches;

CREATE POLICY "Staff can view branches" ON branches
FOR SELECT USING (
  has_role(auth.uid(), 'receptionist'::app_role) OR
  has_role(auth.uid(), 'doctor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can create branches" ON branches
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can update branches" ON branches
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- 14. Update profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 15. Make patient-files storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'patient-files';

-- 16. Add storage policies for patient-files bucket
DROP POLICY IF EXISTS "Staff can view patient files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload patient files" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update patient files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete patient files" ON storage.objects;

CREATE POLICY "Staff can view patient files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'patient-files' AND (
    has_role(auth.uid(), 'receptionist'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Staff can upload patient files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'patient-files' AND (
    has_role(auth.uid(), 'receptionist'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Staff can update patient files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'patient-files' AND (
    has_role(auth.uid(), 'receptionist'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admin can delete patient files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'patient-files' AND
  has_role(auth.uid(), 'admin'::app_role)
);