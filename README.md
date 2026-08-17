# Dr prasanna crm 

# App Flow Map — Appointment CRM for Dr. Prasanna

Each item below is: **Screen / UI element → Action (click/tap) → Result / Redirect / UI change → Backend call(s) (if applicable)**.
I show default success path first, then important alternate/error paths.

---

# 1 Global common behavior

* Global header (top bar): Clinic logo (left) → Click: redirect to **Dashboard**.
* Right: User avatar → Click: open **User menu** (Profile, Settings, Switch Branch (if allowed), Logout).
* Left: Hamburger / side nav → Click: open navigation (Dashboard, Calendar, Patients, Appointments, Follow-ups, Reports, Billing, Admin).
* Toast / snackbar: shows success/error messages on actions.
* Modals: used for quick-create (patient, appointment) and confirmation dialogs.
* API errors: Show contextual inline error + global toast. Retry/cancel options.

---

# 2 Authentication / Entry

## Login Screen

* Fields: email/phone & password, Branch selector (if receptionist).
* Buttons:

  * **Login** → On success: store JWT, fetch user profile + permissions, fetch branch list (if admin/doctor), then **redirect**:

    * Receptionist: If multiple branches assigned → show **Branch Selector modal** → choose branch → redirect to **Receptionist Dashboard** with branch context. If assigned to one, go straight to Dashboard.
    * Doctor: Redirect to **Doctor Dashboard (Today’s Schedule)** across branches (or branch filter).
    * Admin: Redirect to **Admin Dashboard (Clinic Overview)**.
  * **Forgot password** → opens **Reset Password** modal / page → user enters email → API `POST /auth/forgot` → show confirmation toast.
* On auth failure: show inline error, allow retry. Lockout after n attempts (configurable).

---

# 3 Receptionist flows (branch-scoped)

## 3.1 Receptionist Dashboard (default)

* Shows: Today’s appointments list, Follow-ups badge, Quick-create buttons: [New Patient], [Book Appointment], [Check-in], [Payments].
* Click **New Patient** → opens **Patient Create modal/page**.

### Patient Create modal/page

* Sections: Basic Info, Emergency Contact, Insurance, Preferred Communication, Photo & Consent, Attachments, Notes.
* Actions:

  * **Upload Photo** → opens file chooser → client-side crop UI → click **Save Photo** → show preview thumbnail; backend: `POST /patients/:id/photo` (multipart or presigned), returns URLs → UI updates thumbnail.
  * **Capture Photo** → opens camera (mobile) or webcam modal → take photo → crop → save same as Upload.
  * **Sign Consent** → click → open **Signature Pad modal** → sign → **Save** → upload via `POST /patients/:id/consent` → server saves consent_document_url, consent_signed = true → returns success; UI shows consent timestamp.
  * **Save Patient** → client validates fields (required ones); API `POST /patients` → on success: close modal and redirect to **Patient Profile page** (or show mini toast with link to profile).
  * Error: display field-level validation errors.

### After Create: Patient Profile page

* Top-left: Photo thumbnail (click → open full-size lightbox with options: Download (admin), Replace, Remove (admin only)).
* Tabs: Overview, Medical Records, Appointments, Files, Billing, Audit Logs.
* Buttons: **Book Appointment**, **Edit**, **Add File**, **Request Consent**.
* Click **Book Appointment** → opens **Appointment modal** prefilled with patient data.

## 3.2 Calendar (Receptionist)

* Navigation: Day / Week / Month buttons; Branch selector at top.
* Click any date (calendar cell) → **Daily Follow-up Popup** opens (overlay).

  * Backend: `GET /followups?date=YYYY-MM-DD&branch=ID` + `GET /appointments?branch=ID&date=...` to populate.
  * Popup lists doctor-flagged follow-ups first, then missed appointments.
  * Each row: thumbnail, name, time, reason, urgency.
  * Row actions:

    * **Call** → `tel:` link opens phone dialer (mobile) OR prompt to use softphone; logs action to audit via `POST /audit_logs`.
    * **Message** → open **Message Modal** with prefilled template → choose SMS/WhatsApp → click **Send** → `POST /notifications/send` → show success/failed.
    * **Mark Done** → API `PUT /followups/:id` set status=done → UI removes row and shows success toast.
    * **Reschedule** → open **Appointment reschedule modal** (see below).
    * **Open Patient** → redirect to Patient Profile page.
  * Popup actions: **Snooze** → schedules a snooze entry; **Dismiss** → closes.
* Click empty time slot on calendar → open **Appointment modal**.

### Appointment modal (Create / Reschedule)

* Fields: Doctor (dropdown), Appointment type (new/follow-up/procedure/tele), Date/time picker, Duration (auto from type with editable), Buffer minutes, Notes, Source (walk-in/phone/online).
* Actions:

  * **Save** → API `POST /appointments` (server checks double-booking & buffers) → on success: calendar refresh, toast, optional SMS reminder queued.
  * If double-booking detected: show conflict modal listing conflicting appts with options: Force Book (admin only) / Choose another slot / Add to waitlist.
  * **Cancel** → close modal.
* After Save: show quick **Print Receipt** (if billing created).

## 3.3 Check-in & In-clinic flow

* On Receptionist Dashboard: click **Check-in** next to appointment → API `POST /appointments/:id/checkin` → status updates → show **Vitals Modal** (optional) → save vitals to `medical_records` or separate `vitals` table.
* Click **Start Consultation** (if doctor present) → marks `in_consultation`. Receptionist can also mark **No-show** after configured grace period.

## 3.4 No-show & Waitlist

* If patient no-shows: receptionist clicks **Mark No-show** → API `POST /appointments/:id/mark-no-show` → triggers follow-up creation (configurable), notification to admin/doctor, logs audit.
* Waitlist: when booking and slot unavailable, receptionist can add patient to waitlist (`POST /waitlist`) → waiting list UI shows.

---

# 4 Doctor flows

## 4.1 Doctor Dashboard (Today’s Schedule)

* Shows compact list of today’s appointments across branches or filtered by branch.
* Each appointment row: patient thumbnail, name, time, appointment type, status.
* Actions:

  * Click appointment → redirect to **Consultation / Patient Record screen** (medical record view).
  * Quick action **Set Follow-up** → opens small modal: choose follow-up date/time & reason → `POST /followups` → receptionist receives in their follow-up popup.
  * **Add Prescription** button in patient record → open Prescription builder modal.
  * **Request Consent/Photo** if patient lacks consent/photo → triggers a task for receptionist (`POST /tasks` or `send notification`).

## 4.2 Consultation / Patient Record screen

* Sections: Header (photo, consent status, demographics), Tabs for History, Visits, Labs/Files, Prescriptions, Billing.
* Add note: textarea → **Save Note** → `POST /medical_records` → appears in timeline.
* Add prescription: structured fields + save → `POST /prescriptions` → option to generate PDF → `GET /prescriptions/:id/pdf`.
* Attach lab order: `POST /lab_requests` (v1+ integration).
* Set follow-up: (see above).
* Request tests/images: create task/notification for admin/receptionist or send to lab integration.

## 4.3 Teleconsultation (v1+)

* Click **Start Teleconsult** → generate secure link via API `POST /teleconsult/session` → opens video window or redirect to webRTC room. Recordings disabled by default unless policy & consent.

---

# 5 Admin flows

## 5.1 Admin Dashboard

* Widgets: Appointments today, no-shows, revenue summary, pending follow-ups, system alerts (failed backups, low SMS credits).
* Click widget:

  * Appointments → redirect to Reports → list and export.
  * No-shows → reports page with filters.
  * Pending follow-ups → opens follow-ups view with ability to reassign.

## 5.2 Branch & User management

* Side nav: **Branches** → Click branch → open Branch settings page (address, hours, holidays).
* **Users** → click user → open user profile → actions: edit, deactivate, assign branches, roles.
* Create user: **New User** modal → fill fields → `POST /users` → system sends welcome email.

## 5.3 Settings

* Notifications → edit templates → save → `PUT /settings/notifications`.
* Privacy → toggle `Require consent before photo` → save; this enforces checks in patient photo upload endpoints.
* Retention → set `photo_retention_days` → save; scheduled job will honor this.
* Integrations → enter SMS provider / WhatsApp keys → test connection → backend stores secrets.

## 5.4 Audit Logs & Exports

* Click **Audit Logs** → filter by entity/date → view entries → click entry → show before/after diff view.
* Export → choose CSV/PDF → `GET /audit_logs/export?...` → job may be scheduled for large exports.

---

# 6 Patient Portal (v1+ - optional)

## Login / Register (patient)

* Patients can view upcoming appointments, download prescriptions, request reschedule, and upload documents.
* Click **Request Reschedule** → create appointment reschedule request → receptionist receives in queue.

---

# 7 File & Photo flows (detailed)

## Upload Photo (Receptionist / patient portal)

* Click **Upload Photo** → client-side crop/compress → preview → **Upload** triggers:

  * Option A (direct upload): request presigned URL `POST /files/presign` → client PUTs file to S3 → client notifies server `POST /files/complete` with metadata → server updates `patients.photo_url` & `photo_thumbnail_url` after generating thumbnail (or use background job).
  * Option B (multipart to server): `POST /patients/:id/photo` with multipart; server processes and stores.
* After successful upload: thumbnail shown in patient card, audit log entry created: `audit_logs`.
* If `Require consent before photo` ON & consent is missing: block upload and show modal: “Consent required. Capture consent now?” → buttons: `Open Consent Modal` / `Upload Anyway (admin override)`.

## Consent capture

* Click **Sign Consent** → Signature pad modal → patient signs → Save → API `POST /patients/:id/consent` with PNG/PDF → server sets `consent_signed=true`, stores `consent_document_url`, logs audit.
* Consent text link: opens legal wording modal (read-only).

## Delete Photo / Request Deletion (Privacy flow)

* Patient requests deletion via portal or receptionist logs request.
* Admin reviews request → clicks **Approve Deletion** → system runs background job to delete file(s) from storage, set DB fields null, create audit entry, notify patient by email.
* If retention policy prohibits immediate deletion, admin sees warning and a scheduled deletion date.

---

# 8 Notifications & Reminders flow

* Event: Appointment created/rescheduled → system enqueues reminder job (e.g., 24h & 1h before) following patient `preferred_communication`.
* Reminders use templates; `POST /notifications/send` called by backend scheduler to provider.
* If provider returns failure: mark notification status = failed, retry per policy (e.g., 3 attempts), and notify admin if credits low.
* Opt-out handling: if patient `communication_optout=true`, do not send; record attempted send in logs with reason.

---

# 9 Error & Edge case flows

## Double-booking/conflict

* Attempt to save appointment → server returns 409 CONFLICT with conflicting appt details → UI shows conflict modal listing conflicts + options: pick another slot, add to waitlist, or force-book (admin only).

## Offline / Network failure (Receptionist mobile)

* If offline: quick-create patient & appointment stored locally (indexedDB), show offline badge; sync on reconnect via background sync job. (v1+ optional). Show conflict resolution UI on sync if duplicate created.

## Unauthorized access

* If user attempts restricted action (e.g., receptionist deleting patient) → server returns 403 → UI shows “Permission denied” modal with contact admin.

## Expired session

* If JWT expired on action: API returns 401 → client shows session modal: “Session expired — please login” → user redirected to Login; unsaved data stored in local state if possible.

## Provider errors (SMS/WhatsApp)

* Show notification status as Failed; admin dashboard shows provider issue banner; offer retry button.

---

# 10 Navigation map — simplified (for devs)

* Login → Branch selector (if needed)
  Receptionist Dashboard → Calendar → Date click → Follow-up Popup → (Open Patient / Reschedule / Message / Mark Done)
  Receptionist Dashboard → New Patient → Patient Profile → Book Appointment
  Calendar → Slot click → Appointment Modal (Create/Reschedule)
  Appointment → Click → Open Appointment Detail → Check-in / Start Consultation / Mark No-show
  Doctor Dashboard → Appointment click → Consultation Screen (Add Notes / Prescriptions / Follow-up)
  Admin Dashboard → Branches / Users / Settings / Audit Logs / Reports

---

# 11 Recommended API call list per major UI action (quick reference)

* Login: `POST /auth/login`
* Load dashboard: `GET /appointments?date=...&branch=...`, `GET /followups?date=...`
* Create patient: `POST /patients`
* Upload photo: `POST /files/presign` + PUT to S3 + `POST /files/complete` or `POST /patients/:id/photo`
* Sign consent: `POST /patients/:id/consent`
* Create appointment: `POST /appointments`
* Reschedule: `PUT /appointments/:id`
* Check-in: `POST /appointments/:id/checkin`
* Mark no-show: `POST /appointments/:id/mark-no-show`
* Create followup: `POST /followups`
* Send notification: `POST /notifications/send`
* Fetch audit logs: `GET /audit_logs`

---

# 12 Quick UX microcopy suggestions (for key buttons)

* Book Appointment → “Confirm Booking”
* Upload Photo → “Upload & Save”
* Capture Photo → “Use Camera”
* Sign Consent → “Sign & Save Consent”
* Mark Done (follow-up) → “Mark Complete”
* Reschedule → “Pick New Slot”
* Snooze → “Snooze 1 hour” / “Snooze till EOD”
* Force Book (admin) → “Force Book (Admin only) — confirm”

---

# 13 Final checklist for implementation from flow perspective

* Ensure RBAC enforced server-side for every endpoint & UI action.
* Daily Follow-up Popup must be fast — pre-fetch followups for selected date on calendar hover to minimize delay.
* Photo upload & consent flows must be transactional or clearly communicate partial-save states.
* Provide undo / confirmation for destructive actions (delete photo, delete patient).
* Handle SMS/WhatsApp opt-out correctly; do not send reminders if opt-out.
* Make branch selection persistent across session for receptionists.
* Provide clear error messages and recovery steps (retries, contact admin).
* Provide audit trail links on patient & appointment pages for compliance.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://appt-quest-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1d1dc80-3905-4bdf-8251-5e4f55c2455a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
