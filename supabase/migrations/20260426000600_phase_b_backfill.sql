begin;

-- =========================================================
-- PHASE B BACKFILL (IDEMPOTENT, NON-CUTOVER, SAFETY UPDATED)
-- Safety updates:
-- - Skill match normalization: lower(trim(name))
-- - Session date option: date(recorded_at) normalization
-- =========================================================

-- A) skills -> skill_groups (default legacy group per subject)
insert into public.skill_groups (
  workspace_id,
  subject_id,
  code,
  name,
  description,
  display_order,
  created_by
)
select
  s.workspace_id,
  s.id as subject_id,
  'LEGACY_FLAT' as code,
  'Legacy Import (Flat Skills)' as name,
  'Auto-generated group from old flat skills model',
  0 as display_order,
  null::uuid as created_by
from public.subjects s
where exists (
  select 1
  from public.skills sk
  where sk.subject_id = s.id
    and sk.workspace_id = s.workspace_id
)
on conflict (subject_id, name) do nothing;

-- B) skills -> assessment_items
insert into public.assessment_items (
  workspace_id,
  subject_id,
  skill_group_id,
  code,
  name,
  description,
  standard_type,
  display_order,
  is_active,
  created_by
)
select
  sk.workspace_id,
  sk.subject_id,
  sg.id as skill_group_id,
  sk.code,
  sk.name,
  sk.description,
  'LAIN' as standard_type,
  sk.display_order,
  true as is_active,
  sk.created_by
from public.skills sk
join public.skill_groups sg
  on sg.workspace_id = sk.workspace_id
 and sg.subject_id = sk.subject_id
 and sg.name = 'Legacy Import (Flat Skills)'
on conflict (skill_group_id, name) do update
set
  code = excluded.code,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();

-- C) assessments -> assessment_sessions
with normalized_assessments as (
  select
    a.id as assessment_id,
    a.workspace_id,
    coalesce(a.class_id, st.class_id) as normalized_class_id,
    a.subject_id,
    a.student_id,
    a.recorded_at as session_date, -- change to date(a.recorded_at) if source is timestamp
    first_value(a.recorded_by) over (
      partition by a.workspace_id, coalesce(a.class_id, st.class_id), a.subject_id, a.student_id, a.recorded_at
      order by a.created_at asc nulls last, a.id asc
    ) as normalized_recorded_by
  from public.assessments a
  join public.students st
    on st.id = a.student_id
   and st.workspace_id = a.workspace_id
)
insert into public.assessment_sessions (
  workspace_id,
  class_id,
  subject_id,
  student_id,
  session_date,
  term_label,
  notes,
  recorded_by
)
select distinct
  na.workspace_id,
  na.normalized_class_id as class_id,
  na.subject_id,
  na.student_id,
  na.session_date,
  null::text as term_label,
  null::text as notes,
  na.normalized_recorded_by as recorded_by
from normalized_assessments na
where na.normalized_class_id is not null
on conflict (class_id, subject_id, student_id, session_date) do nothing;

-- D) assessments -> assessment_session_items
with normalized_assessments as (
  select
    a.id as assessment_id,
    a.workspace_id,
    coalesce(a.class_id, st.class_id) as normalized_class_id,
    a.subject_id,
    a.student_id,
    a.skill_id,
    a.mastery_level,
    a.evidence,
    a.note,
    a.recorded_by,
    a.recorded_at as session_date, -- change to date(a.recorded_at) if source is timestamp
    a.created_at,
    a.updated_at
  from public.assessments a
  join public.students st
    on st.id = a.student_id
   and st.workspace_id = a.workspace_id
),
mapped as (
  select
    na.*,
    s.id as session_id,
    ai.id as assessment_item_id
  from normalized_assessments na
  join public.assessment_sessions s
    on s.workspace_id = na.workspace_id
   and s.class_id = na.normalized_class_id
   and s.subject_id = na.subject_id
   and s.student_id = na.student_id
   and s.session_date = na.session_date
  join public.skills sk
    on sk.id = na.skill_id
   and sk.workspace_id = na.workspace_id
  join public.assessment_items ai
    on ai.workspace_id = na.workspace_id
   and ai.subject_id = na.subject_id
   and lower(trim(ai.name)) = lower(trim(sk.name))
  where na.normalized_class_id is not null
)
insert into public.assessment_session_items (
  workspace_id,
  session_id,
  assessment_item_id,
  mastery_level,
  evidence,
  note,
  recorded_by,
  recorded_at,
  created_at,
  updated_at
)
select
  m.workspace_id,
  m.session_id,
  m.assessment_item_id,
  m.mastery_level,
  m.evidence,
  m.note,
  m.recorded_by,
  coalesce(m.updated_at, m.created_at, now()) as recorded_at,
  coalesce(m.created_at, now()) as created_at,
  coalesce(m.updated_at, now()) as updated_at
from mapped m
on conflict (session_id, assessment_item_id) do update
set
  mastery_level = excluded.mastery_level,
  evidence = excluded.evidence,
  note = excluded.note,
  recorded_by = excluded.recorded_by,
  recorded_at = excluded.recorded_at,
  updated_at = now();

commit;

