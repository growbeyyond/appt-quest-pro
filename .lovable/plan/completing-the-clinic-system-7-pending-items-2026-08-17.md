# Completing the Clinic System: 7 Pending Items

Work is ordered by risk. Each item is independently shippable.

## 1. Fix prescription access control (security, first)

Two database policies currently let any doctor create a prescription — and attach medicines to it — for a patient in another branch they do not treat.

- Remove the over-permissive "Doctors can create prescriptions" policy so only the patient-scoped policy applies.
- Rewrite the `prescription_items` insert policy to require access to the parent prescription's patient.
- Re-run the security scan and confirm both findings clear.

## 2. Homeopathy-specific clinical record

Replace the generic consultation form with a structured homeopathic case record.

- New case-taking record per consultation: chief complaints with chronology and intensity, mentals and emotionals, physical generals, modalities (better/worse from), past/family/personal/treatment history, constitutional observations.
- Rubrics list with remedy shortlist and selection rationale.
- Prescription upgraded to homeopathic fields: remedy name, potency (6C/30C/200C/1M/LM etc.), dose, repetition, duration, dispensing form.
- Follow-up outcome tracking: aggravation/improvement scale, remedy response, and remedy change history visible across visits.

## 3. Inventory and dispensing

- Stock items with remedy name, potency, form, batch, expiry, supplier, purchase and sale price, branch, quantity and reorder level.
- Stock movement ledger: purchase, dispense, adjustment, expiry write-off — every change recorded with user and reason.
- Automatic deduction when a prescription is dispensed, with a dispense confirmation step.
- Low-stock and near-expiry alerts on the dashboard.

## 4. Working audit trail

- Database triggers that write to `audit_logs` on insert/update/delete for patients, appointments, prescriptions, invoices, payments, roles and branches — capturing user, action, and changed fields.
- Audit Logs screen gains filters by user, entity, action and date range.

## 5. Scheduling integrity

- Database-level constraint preventing two active appointments for the same doctor, date and overlapping time — so simultaneous bookings cannot both succeed.
- Clear, friendly error when a slot is taken while the user was filling the form.
- Doctor working hours per branch, weekly roster, leave and clinic holidays; slot generation and conflict checks respect them.

## 6. Privacy and compliance (DPDP-aligned)

- Privacy notice page and consent capture at registration with stated purpose.
- Consent withdrawal, correction and deletion request workflow with staff queue.
- Data retention setting and grievance contact in Settings.
- Documented breach process page for staff.

## 7. Testing and release readiness

- Vitest test suite covering billing totals, slot conflict logic, role/branch access rules, patient dedupe and prescription validation.
- Lint clean-up of the blocking rules.
- Error monitoring hook and a documented staging-then-production release checklist.

## Technical notes

- Items 1, 4 and 5 are mostly database migrations (policies, triggers, exclusion constraint) plus small UI messaging changes.
- Items 2 and 3 add new tables (`case_records`, `case_rubrics`, `remedy_responses`, `inventory_items`, `inventory_batches`, `stock_movements`) each with GRANTs, RLS and branch scoping consistent with existing tables.
- Existing prescriptions are preserved; homeopathic fields are added alongside, not replacing, current data.
- No change to the manual-WhatsApp communication approach.
