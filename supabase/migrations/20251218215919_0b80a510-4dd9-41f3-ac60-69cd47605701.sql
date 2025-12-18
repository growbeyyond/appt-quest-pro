-- =====================================================
-- Security Fix: Add proper anonymous access denial policies
-- and fix RESTRICTIVE policy issues
-- =====================================================

-- First, drop the problematic RESTRICTIVE "deny anonymous" policies 
-- that don't work correctly, then add proper PERMISSIVE policies

-- =====================================================
-- PROFILES TABLE - Fix anonymous access
-- =====================================================
-- Drop the incorrectly configured RESTRICTIVE policy
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON profiles;

-- Add PERMISSIVE policy requiring authentication for all operations
CREATE POLICY "Require authentication for profiles"
ON profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- PATIENTS TABLE - Fix anonymous access
-- =====================================================
DROP POLICY IF EXISTS "Deny anonymous access to patients" ON patients;

-- Add PERMISSIVE base policy requiring authentication
CREATE POLICY "Require authentication for patients"
ON patients FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- MEDICAL_HISTORY TABLE - Fix anonymous access
-- =====================================================
DROP POLICY IF EXISTS "Deny anonymous access to medical_history" ON medical_history;

-- Add PERMISSIVE base policy requiring authentication
CREATE POLICY "Require authentication for medical_history"
ON medical_history FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- SMS_REMINDERS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to sms_reminders"
ON sms_reminders FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- PATIENT_PORTAL_ACCESS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to patient_portal_access"
ON patient_portal_access FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- APPOINTMENTS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to appointments"
ON appointments FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- MEDICAL_RECORDS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to medical_records"
ON medical_records FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- PRESCRIPTIONS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to prescriptions"
ON prescriptions FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- PRESCRIPTION_ITEMS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to prescription_items"
ON prescription_items FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- FOLLOWUPS TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to followups"
ON followups FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- WAITLIST TABLE - Add anonymous denial
-- =====================================================
CREATE POLICY "Deny anonymous access to waitlist"
ON waitlist FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =====================================================
-- RESCHEDULE_REQUESTS TABLE - Fix INSERT policy and add anonymous denial
-- =====================================================
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create reschedule requests" ON reschedule_requests;

-- Add proper INSERT policy that restricts to patient portal or staff
CREATE POLICY "Staff can create reschedule requests"
ON reschedule_requests FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'receptionist') OR
  has_role(auth.uid(), 'doctor')
);

-- Add anonymous denial
CREATE POLICY "Deny anonymous access to reschedule_requests"
ON reschedule_requests FOR ALL
TO anon
USING (false)
WITH CHECK (false);