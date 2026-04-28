begin;

-- =========================================================
-- class_subjects mapping (class <-> subject in same workspace)
-- =========================================================
create table if not exists public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null,
  subject_id uuid not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint fk_class_subjects_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete cascade,

  constraint fk_class_subjects_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,

  constraint uq_class_subjects_class_subject unique (class_id, subject_id)
);

create index if not exists idx_class_subjects_workspace_id on public.class_subjects(workspace_id);
create index if not exists idx_class_subjects_class_id on public.class_subjects(class_id);
create index if not exists idx_class_subjects_subject_id on public.class_subjects(subject_id);

alter table public.class_subjects enable row level security;

drop policy if exists "class_subjects_select_member" on public.class_subjects;
create policy "class_subjects_select_member"
on public.class_subjects
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "class_subjects_insert_member" on public.class_subjects;
create policy "class_subjects_insert_member"
on public.class_subjects
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "class_subjects_update_member" on public.class_subjects;
create policy "class_subjects_update_member"
on public.class_subjects
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "class_subjects_delete_member" on public.class_subjects;
create policy "class_subjects_delete_member"
on public.class_subjects
for delete
using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.class_subjects to authenticated;

-- =========================================================
-- Ensure assessments history unique is explicit by context
-- =========================================================
alter table public.assessments
  drop constraint if exists assessments_student_id_skill_id_key;

alter table public.assessments
  drop constraint if exists uq_assessments_student_skill_date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_assessments_context_student_skill_date'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint uq_assessments_context_student_skill_date
      unique (class_id, subject_id, student_id, skill_id, recorded_at);
  end if;
end $$;

commit;
