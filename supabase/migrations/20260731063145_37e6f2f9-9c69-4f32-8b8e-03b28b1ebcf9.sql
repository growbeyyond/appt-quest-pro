CREATE SEQUENCE IF NOT EXISTS public.patient_number_seq;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_number text;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.patients
)
UPDATE public.patients p
SET patient_number = 'PT-' || lpad(o.rn::text, 5, '0')
FROM ordered o
WHERE p.id = o.id AND p.patient_number IS NULL;

SELECT setval('public.patient_number_seq', GREATEST((SELECT count(*) FROM public.patients), 1));

ALTER TABLE public.patients
  ALTER COLUMN patient_number SET DEFAULT 'PT-' || lpad(nextval('public.patient_number_seq')::text, 5, '0');

UPDATE public.patients SET patient_number = 'PT-' || lpad(nextval('public.patient_number_seq')::text, 5, '0') WHERE patient_number IS NULL;

ALTER TABLE public.patients ALTER COLUMN patient_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patients_patient_number_key ON public.patients (patient_number);