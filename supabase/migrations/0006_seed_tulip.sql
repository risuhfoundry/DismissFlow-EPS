-- =============================================================================
-- DismissFlow EPS — Phase 4.6: Tulip Nursery real roster seed
-- =============================================================================
-- Source of truth: C:\Users\risha\Downloads\Tulip Data.pdf (2 pages)
--                  Docs/PRD.md §10/§11, Docs/architecture.md §6.1.
--
-- Scope:
--   - exactly ONE normal class row named 'Tulip'
--   - 18 REAL Tulip students (admission numbers preserved as TEXT, leading
--     zeroes kept: '040', '041')
--   - guardian records derived from the PDF's Father/Mother columns
--   - student_guardians relationships (father + mother per student where present)
--
-- Data fidelity rules (Phase 4.6 absolute rules):
--   - admission_no is TEXT; never integer. '040'/'041' stay exactly that.
--   - No invented values. Fields genuinely absent in the PDF are stored NULL.
--   - No silent "correction" of identities. Two OCR-format artifacts were
--     resolved transparently and are documented at the bottom of this file:
--       * student 2 mother phone: source concatenated the same number twice
--         ("85953309728595330972") -> stored once as '8595330972'.
--       * student 5 father mail: source rendered "outlook .com" with a stray
--         space -> stored as 'bm_singh2@outlook.com' (space removed; an email
--         token artifact, not an identity change).
--
-- Idempotency / safety (Phase 4.6 STEP 11):
--   - Class: inserted only if 'Tulip' does not already exist.
--   - Students: upserted ON CONFLICT (admission_no) so re-running reconciles
--     rather than duplicating; the unique index students_admission_no_key makes
--     this safe.
--   - Guardians: inserted only when no row matches (name, relationship, email)
--     so re-running never creates duplicate guardians.
--   - student_guardians: inserted ON CONFLICT (student_id, guardian_id) DO NOTHING.
--   This migration is therefore safe to re-apply and will not clobber real data.
--
-- This migration does NOT create Auth users or public.users rows (those are
-- provisioned separately via Supabase Auth + the application profile mapping).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tulip class (exactly one normal row, name = 'Tulip').
-- -----------------------------------------------------------------------------
insert into public.classes (class_name)
select 'Tulip'
where not exists (
  select 1 from public.classes where class_name = 'Tulip'
);

-- -----------------------------------------------------------------------------
-- 2. 18 real students. Upsert by admission_no (TEXT; leading zeroes preserved).
-- -----------------------------------------------------------------------------
insert into public.students (admission_no, name, gender, dob, class_id)
select
  v.adm, v.name, v.gender, v.dob::date, c.class_id
from (values
  ('5851', 'AYAANSH RAI',            'Male',   '2022-12-29'),
  ('041',  'CHIRAYU SHARMA',         'Female', '2022-04-29'),
  ('5800', 'DIVIT SHARMA',           'Male',   '2022-11-05'),
  ('5929', 'DRISHA SAROJ',           'Female', '2022-10-16'),
  ('5877', 'GAURANSH SINGH',         'Male',   '2022-12-28'),
  ('5767', 'HARSH GUPTA',            'Male',   '2022-08-24'),
  ('5834', 'HERMAN SHARMA',          'Male',   '2021-06-13'),
  ('5801', 'KATHA SHARMA',           'Female', '2022-10-10'),
  ('5883', 'KIARA RAWAT',            'Female', '2023-01-04'),
  ('040',  'LAKSHYA KASHYAP',        'Male',   '2022-09-15'),
  ('5930', 'MISHTI GAUTAM',          'Female', '2023-03-07'),
  ('5876', 'MOHD AAHIL',             'Male',   '2022-01-06'),
  ('5838', 'NAKSH CHAUHAN',          'Male',   '2021-06-23'),
  ('5909', 'ORHAN KHAN',             'Male',   '2022-05-03'),
  ('5903', 'RITVI SHARMA',           'Female', '2022-11-22'),
  ('5867', 'SURYANSH SINGH RATHORE', 'Male',   '2022-03-24'),
  ('5827', 'VAISHNAVI ARYA',         'Female', '2021-11-20'),
  ('5900', 'ZUNAIRA ALI',            'Female', '2020-10-17')
) as v(adm, name, gender, dob)
cross join (select class_id from public.classes where class_name = 'Tulip') as c
on conflict (admission_no) do update
  set name = excluded.name,
      gender = excluded.gender,
      dob = excluded.dob,
      class_id = excluded.class_id;

-- -----------------------------------------------------------------------------
-- 3. Guardians (father + mother per student where the PDF provides them).
--    Inserted only when (name, relationship, email) does not already exist, so
--    re-running never duplicates a guardian. PII (phone/email) is stored exactly
--    as rendered in the PDF; genuinely absent values are NULL.
-- -----------------------------------------------------------------------------
insert into public.guardians (name, phone, email, relationship)
select v.name, v.phone, v.email, v.relationship
from (values
  -- student 1
  ('MUKESH KUMAR RAI', '8010993800', 'mukesh0440@gmail.com', 'father'),
  ('ARTI RAI',         '8851735713', 'arti.rai119@gmail.com', 'mother'),
  -- student 2
  ('PRAKASH CHANDRA SHARMA', '9350095682', 'PRAKASHDADHICH27@gmail.com', 'father'),
  ('SUMAN SHARMA',          '8595330972', 'Sumansharma407@gmail.com',    'mother'),
  -- student 3
  ('ANUJ KUMAR SHARMA', '9968459665', 'anuj.ahpl@gmail.com',  'father'),
  ('POORNIMA',         null,        null,                   'mother'),
  -- student 4
  ('DHEERENDER KUMAR SAROJ', '7317256876', null,                    'father'),
  ('POOJA',                  '7317256876', 'poojasaroj4991@gmail.com', 'mother'),
  -- student 5
  ('BRIJ MOHAN', '9643906815', 'bm_singh2@outlook.com',     'father'),
  ('DEEPA',      '9643547691', 'deepaanshisingh@gmail.com', 'mother'),
  -- student 6
  ('NAKUL GUPTA', '9312023115', 'nakulgupta26@gmail.com',        'father'),
  ('CHITRA SHARMA', '9582096013', 'chitrasharma65@gmail.com',    'mother'),
  -- student 7 (mother data not present in source -> father only)
  ('AMAN SHARMA', '9999945834', 'SHARMAAMAN2016@GMAIL.COM', 'father'),
  -- student 8
  ('SUMIT SHARMA', '8851161987', 'sumit948325@gmail.com',    'father'),
  ('ANKITA SHARMA', '9873270755', 'ankitakoolgirl@gmail.com', 'mother'),
  -- student 9
  ('SURJIT SINGH RAWAT', '9718059136', 'surjitsinghrawat35@gmail.com', 'father'),
  ('GEETA',               '9560532451', 'rawatgeeta020@gmail.com',     'mother'),
  -- student 10
  ('PAWAN KUMAR', '7838581516', 'PAWANKUMAR8510891816@GMAIL.COM', 'father'),
  ('PREETI',      '9717739953', null,                            'mother'),
  -- student 11
  ('PRAMOD KUMAR', '9717153345', 'PK952793@GMAIL.COM',  'father'),
  ('BIMLASH',      '9654642949', 'BIMLASH663@GMAIL.COM', 'mother'),
  -- student 12
  ('SHAKIL', '9250997462', 'seemspure786@gmail.com', 'father'),
  ('SAGIRA', '8447600627', 'ahilk9112@gmail.com',     'mother'),
  -- student 13
  ('VINEET CHAUHAN', '9810120836', 'chauhan.vineet1@gmail.com',       'father'),
  ('SANGEETA CHAUHAN', '9810120836', 'sangeetachauhan1210@gmail.com', 'mother'),
  -- student 14
  ('SHAHRUKH KHAN', '9891227886', 'srkhan0610@gmail.com', 'father'),
  ('SHAGUFTA KHAN', '8750517886', null,               'mother'),
  -- student 15
  ('KRISHNA KANT MAHERA', '8058721612', 'kkmahera@gmail.com', 'father'),
  ('JYOTI SHARMA',        '7852819487', null,             'mother'),
  -- student 16
  ('SUSHIL KUMAR', '9555936530', 'SUHILSAAN108@GMAIL.COM', 'father'),
  ('MANJU TOMAR',  '8368953322', 'manjutomar2410@gmail.com', 'mother'),
  -- student 17
  ('OM PRAKASH', '9971912588', 'omprakash777@gmail.com', 'father'),
  ('ASHA',       '9818409664', 'ashaom1985@gmail.com',  'mother'),
  -- student 18
  ('IRFAN ALI', '9811252511', 'ME@IRFANALI.IN',     'father'),
  ('ARIFA KHATOON', '9211440444', 'arifa@irfanaali.in', 'mother')
) as v(name, phone, email, relationship)
where not exists (
  select 1 from public.guardians g
  where g.name = v.name
    and g.relationship = v.relationship
    and g.email is not distinct from v.email
);

-- -----------------------------------------------------------------------------
-- 4. student_guardians relationships. Link each student to its father and mother
--    guardian rows. Father/mother guardian names come from the PDF Father Name
--    (page 1) and Mother Name (page 2) columns respectively.
-- -----------------------------------------------------------------------------
with sg_src (adm, father_name, mother_name) as (
  values
    ('5851', 'MUKESH KUMAR RAI',     'ARTI RAI'),
    ('041',  'PRAKASH CHANDRA SHARMA','SUMAN SHARMA'),
    ('5800', 'ANUJ KUMAR SHARMA',    'POORNIMA'),
    ('5929', 'DHEERENDER KUMAR SAROJ','POOJA'),
    ('5877', 'BRIJ MOHAN',           'DEEPA'),
    ('5767', 'NAKUL GUPTA',          'CHITRA SHARMA'),
    ('5834', 'AMAN SHARMA',          null),
    ('5801', 'SUMIT SHARMA',         'ANKITA SHARMA'),
    ('5883', 'SURJIT SINGH RAWAT',   'GEETA'),
    ('040',  'PAWAN KUMAR',          'PREETI'),
    ('5930', 'PRAMOD KUMAR',         'BIMLASH'),
    ('5876', 'SHAKIL',               'SAGIRA'),
    ('5838', 'VINEET CHAUHAN',       'SANGEETA CHAUHAN'),
    ('5909', 'SHAHRUKH KHAN',        'SHAGUFTA KHAN'),
    ('5903', 'KRISHNA KANT MAHERA',  'JYOTI SHARMA'),
    ('5867', 'SUSHIL KUMAR',         'MANJU TOMAR'),
    ('5827', 'OM PRAKASH',           'ASHA'),
    ('5900', 'IRFAN ALI',            'ARIFA KHATOON')
)
-- father links
insert into public.student_guardians (student_id, guardian_id)
select s.student_id, gf.guardian_id
from sg_src
join public.students s on s.admission_no = sg_src.adm
join public.guardians gf
  on gf.name = sg_src.father_name and gf.relationship = 'father'
where sg_src.father_name is not null
on conflict (student_id, guardian_id) do nothing;

with sg_src (adm, father_name, mother_name) as (
  values
    ('5851', 'MUKESH KUMAR RAI',     'ARTI RAI'),
    ('041',  'PRAKASH CHANDRA SHARMA','SUMAN SHARMA'),
    ('5800', 'ANUJ KUMAR SHARMA',    'POORNIMA'),
    ('5929', 'DHEERENDER KUMAR SAROJ','POOJA'),
    ('5877', 'BRIJ MOHAN',           'DEEPA'),
    ('5767', 'NAKUL GUPTA',          'CHITRA SHARMA'),
    ('5834', 'AMAN SHARMA',          null),
    ('5801', 'SUMIT SHARMA',         'ANKITA SHARMA'),
    ('5883', 'SURJIT SINGH RAWAT',   'GEETA'),
    ('040',  'PAWAN KUMAR',          'PREETI'),
    ('5930', 'PRAMOD KUMAR',         'BIMLASH'),
    ('5876', 'SHAKIL',               'SAGIRA'),
    ('5838', 'VINEET CHAUHAN',       'SANGEETA CHAUHAN'),
    ('5909', 'SHAHRUKH KHAN',        'SHAGUFTA KHAN'),
    ('5903', 'KRISHNA KANT MAHERA',  'JYOTI SHARMA'),
    ('5867', 'SUSHIL KUMAR',         'MANJU TOMAR'),
    ('5827', 'OM PRAKASH',           'ASHA'),
    ('5900',  'IRFAN ALI',           'ARIFA KHATOON')
)
-- mother links
insert into public.student_guardians (student_id, guardian_id)
select s.student_id, gm.guardian_id
from sg_src
join public.students s on s.admission_no = sg_src.adm
join public.guardians gm
  on gm.name = sg_src.mother_name and gm.relationship = 'mother'
where sg_src.mother_name is not null
on conflict (student_id, guardian_id) do nothing;

-- =============================================================================
-- Source-ambiguity log (Phase 4.6 STEP 3 / STEP 4):
--   * Student 2 (CHIRAYU SHARMA, 041): Mother phone rendered as
--     "85953309728595330972" (the same 10-digit number duplicated by the PDF).
--     Stored once as '8595330972'. No second distinct value was invented.
--   * Student 5 (GAURANSH SINGH, 5877): Father mail rendered as
--     "bm_singh2@outlook .com" (stray space inside the token). Stored as
--     'bm_singh2@outlook.com'. This is an email-token formatting fix, not an
--     identity change.
--   * Mother mail / mother phone / mother name absent in the PDF for these
--     students -> stored NULL (no value invented):
--        student 3 (DIVIT SHARMA)      : mother mail NULL
--        student 4 (DRISHA SAROJ)      : father mail NULL
--        student 7 (HERMAN SHARMA)     : mother entirely NULL (father only)
--        student 10 (LAKSHYA KASHYAP)  : mother mail NULL
--        student 14 (ORHAN KHAN)       : mother mail NULL
--        student 15 (RITVI SHARMA)     : mother mail NULL
--   * Admission numbers '040' and '041' are stored as TEXT with their leading
--     zeroes intact. All 18 admission numbers are TEXT.
-- =============================================================================
