begin;

-- =========================================================
-- Phase A: New PBD assessment model (non-breaking)
-- - skill_groups
-- - assessment_items
-- - assessment_sessions
-- - assessment_session_items
-- - assessment_summaries
-- =========================================================

-- ---------------------------------------------------------
-- skill_groups (bidang / kelompok / modul)
-- ---------------------------------------------------------
create table if not exists public.skill_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid not null,
  code text,
  name text not null,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_skill_groups_subject_name unique (subject_id, name),
  constraint uq_skill_groups_id_workspace unique (id, workspace_id),
  constraint uq_skill_groups_id_subject unique (id, subject_id),
  constraint fk_skill_groups_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade
);

create index if not exists idx_skill_groups_workspace_id on public.skill_groups(workspace_id);
create index if not exists idx_skill_groups_subject_id on public.skill_groups(subject_id);
create index if not exists idx_skill_groups_display_order on public.skill_groups(display_order);

-- ---------------------------------------------------------
-- assessment_items (item pentaksiran bawah setiap group)
-- ---------------------------------------------------------
create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid not null,
  skill_group_id uuid not null,
  code text,
  name text not null,
  description text,
  standard_type text check (standard_type in ('SK', 'SP', 'STANDARD_PRESTASI', 'KRITERIA', 'LAIN') or standard_type is null),
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_assessment_items_group_name unique (skill_group_id, name),
  constraint uq_assessment_items_id_workspace unique (id, workspace_id),
  constraint fk_assessment_items_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_items_group_workspace
    foreign key (skill_group_id, workspace_id)
    references public.skill_groups(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_items_group_subject
    foreign key (skill_group_id, subject_id)
    references public.skill_groups(id, subject_id)
    on delete cascade
);

create index if not exists idx_assessment_items_workspace_id on public.assessment_items(workspace_id);
create index if not exists idx_assessment_items_subject_id on public.assessment_items(subject_id);
create index if not exists idx_assessment_items_group_id on public.assessment_items(skill_group_id);
create index if not exists idx_assessment_items_display_order on public.assessment_items(display_order);
create index if not exists idx_assessment_items_active on public.assessment_items(is_active);

-- ---------------------------------------------------------
-- assessment_sessions (header/history by date)
-- ---------------------------------------------------------
create table if not exists public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null,
  subject_id uuid not null,
  student_id uuid not null,
  session_date date not null,
  term_label text,
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_assessment_sessions_context_date unique (class_id, subject_id, student_id, session_date),
  constraint uq_assessment_sessions_id_workspace unique (id, workspace_id),
  constraint fk_assessment_sessions_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_sessions_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_sessions_student_workspace
    foreign key (student_id, workspace_id)
    references public.students(id, workspace_id)
    on delete cascade
);

create index if not exists idx_assessment_sessions_workspace_id on public.assessment_sessions(workspace_id);
create index if not exists idx_assessment_sessions_class_id on public.assessment_sessions(class_id);
create index if not exists idx_assessment_sessions_subject_id on public.assessment_sessions(subject_id);
create index if not exists idx_assessment_sessions_student_id on public.assessment_sessions(student_id);
create index if not exists idx_assessment_sessions_date on public.assessment_sessions(session_date);

-- ---------------------------------------------------------
-- assessment_session_items (detail TP per item in session)
-- ---------------------------------------------------------
create table if not exists public.assessment_session_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_id uuid not null,
  assessment_item_id uuid not null,
  mastery_level public.mastery_level_enum not null,
  evidence text,
  note text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_assessment_session_items_session_item unique (session_id, assessment_item_id),
  constraint uq_assessment_session_items_id_workspace unique (id, workspace_id),
  constraint fk_assessment_session_items_session_workspace
    foreign key (session_id, workspace_id)
    references public.assessment_sessions(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_session_items_item_workspace
    foreign key (assessment_item_id, workspace_id)
    references public.assessment_items(id, workspace_id)
    on delete restrict
);

create index if not exists idx_assessment_session_items_workspace_id on public.assessment_session_items(workspace_id);
create index if not exists idx_assessment_session_items_session_id on public.assessment_session_items(session_id);
create index if not exists idx_assessment_session_items_item_id on public.assessment_session_items(assessment_item_id);
create index if not exists idx_assessment_session_items_recorded_at on public.assessment_session_items(recorded_at);
create index if not exists idx_assessment_session_items_mastery_level on public.assessment_session_items(mastery_level);

-- ---------------------------------------------------------
-- assessment_summaries (TP keseluruhan)
-- ---------------------------------------------------------
create table if not exists public.assessment_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null,
  subject_id uuid not null,
  student_id uuid not null,
  summary_date date not null,
  period_type text not null default 'custom' check (period_type in ('midyear', 'final', 'custom')),
  tp_overall public.mastery_level_enum not null,
  rationale text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_assessment_summaries_context_period unique (class_id, subject_id, student_id, period_type, summary_date),
  constraint uq_assessment_summaries_id_workspace unique (id, workspace_id),
  constraint fk_assessment_summaries_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_summaries_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,
  constraint fk_assessment_summaries_student_workspace
    foreign key (student_id, workspace_id)
    references public.students(id, workspace_id)
    on delete cascade
);

create index if not exists idx_assessment_summaries_workspace_id on public.assessment_summaries(workspace_id);
create index if not exists idx_assessment_summaries_class_id on public.assessment_summaries(class_id);
create index if not exists idx_assessment_summaries_subject_id on public.assessment_summaries(subject_id);
create index if not exists idx_assessment_summaries_student_id on public.assessment_summaries(student_id);
create index if not exists idx_assessment_summaries_summary_date on public.assessment_summaries(summary_date);
create index if not exists idx_assessment_summaries_period_type on public.assessment_summaries(period_type);
create index if not exists idx_assessment_summaries_tp_overall on public.assessment_summaries(tp_overall);

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------
drop trigger if exists trg_skill_groups_updated_at on public.skill_groups;
create trigger trg_skill_groups_updated_at
before update on public.skill_groups
for each row
execute function public.set_updated_at();

drop trigger if exists trg_assessment_items_updated_at on public.assessment_items;
create trigger trg_assessment_items_updated_at
before update on public.assessment_items
for each row
execute function public.set_updated_at();

drop trigger if exists trg_assessment_sessions_updated_at on public.assessment_sessions;
create trigger trg_assessment_sessions_updated_at
before update on public.assessment_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_assessment_session_items_updated_at on public.assessment_session_items;
create trigger trg_assessment_session_items_updated_at
before update on public.assessment_session_items
for each row
execute function public.set_updated_at();

drop trigger if exists trg_assessment_summaries_updated_at on public.assessment_summaries;
create trigger trg_assessment_summaries_updated_at
before update on public.assessment_summaries
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS enable
-- ---------------------------------------------------------
alter table public.skill_groups enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_session_items enable row level security;
alter table public.assessment_summaries enable row level security;

-- ---------------------------------------------------------
-- RLS policies: skill_groups
-- ---------------------------------------------------------
drop policy if exists "skill_groups_select_member" on public.skill_groups;
create policy "skill_groups_select_member"
on public.skill_groups
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "skill_groups_insert_member" on public.skill_groups;
create policy "skill_groups_insert_member"
on public.skill_groups
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "skill_groups_update_member" on public.skill_groups;
create policy "skill_groups_update_member"
on public.skill_groups
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "skill_groups_delete_member" on public.skill_groups;
create policy "skill_groups_delete_member"
on public.skill_groups
for delete
using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- RLS policies: assessment_items
-- ---------------------------------------------------------
drop policy if exists "assessment_items_select_member" on public.assessment_items;
create policy "assessment_items_select_member"
on public.assessment_items
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "assessment_items_insert_member" on public.assessment_items;
create policy "assessment_items_insert_member"
on public.assessment_items
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.skill_groups sg
    where sg.id = skill_group_id
      and sg.workspace_id = workspace_id
      and sg.subject_id = subject_id
  )
);

drop policy if exists "assessment_items_update_member" on public.assessment_items;
create policy "assessment_items_update_member"
on public.assessment_items
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.skill_groups sg
    where sg.id = skill_group_id
      and sg.workspace_id = workspace_id
      and sg.subject_id = subject_id
  )
);

drop policy if exists "assessment_items_delete_member" on public.assessment_items;
create policy "assessment_items_delete_member"
on public.assessment_items
for delete
using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- RLS policies: assessment_sessions
-- ---------------------------------------------------------
drop policy if exists "assessment_sessions_select_member" on public.assessment_sessions;
create policy "assessment_sessions_select_member"
on public.assessment_sessions
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "assessment_sessions_insert_member" on public.assessment_sessions;
create policy "assessment_sessions_insert_member"
on public.assessment_sessions
for insert
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.students st
    where st.id = student_id
      and st.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_sessions_update_member" on public.assessment_sessions;
create policy "assessment_sessions_update_member"
on public.assessment_sessions
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.students st
    where st.id = student_id
      and st.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_sessions_delete_member" on public.assessment_sessions;
create policy "assessment_sessions_delete_member"
on public.assessment_sessions
for delete
using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- RLS policies: assessment_session_items
-- ---------------------------------------------------------
drop policy if exists "assessment_session_items_select_member" on public.assessment_session_items;
create policy "assessment_session_items_select_member"
on public.assessment_session_items
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "assessment_session_items_insert_member" on public.assessment_session_items;
create policy "assessment_session_items_insert_member"
on public.assessment_session_items
for insert
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.assessment_sessions s
    where s.id = session_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.assessment_items i
    where i.id = assessment_item_id
      and i.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_session_items_update_member" on public.assessment_session_items;
create policy "assessment_session_items_update_member"
on public.assessment_session_items
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.assessment_sessions s
    where s.id = session_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.assessment_items i
    where i.id = assessment_item_id
      and i.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_session_items_delete_member" on public.assessment_session_items;
create policy "assessment_session_items_delete_member"
on public.assessment_session_items
for delete
using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- RLS policies: assessment_summaries
-- ---------------------------------------------------------
drop policy if exists "assessment_summaries_select_member" on public.assessment_summaries;
create policy "assessment_summaries_select_member"
on public.assessment_summaries
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "assessment_summaries_insert_member" on public.assessment_summaries;
create policy "assessment_summaries_insert_member"
on public.assessment_summaries
for insert
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.students st
    where st.id = student_id
      and st.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_summaries_update_member" on public.assessment_summaries;
create policy "assessment_summaries_update_member"
on public.assessment_summaries
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.students st
    where st.id = student_id
      and st.workspace_id = workspace_id
  )
);

drop policy if exists "assessment_summaries_delete_member" on public.assessment_summaries;
create policy "assessment_summaries_delete_member"
on public.assessment_summaries
for delete
using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------
-- Grants
-- ---------------------------------------------------------
grant select, insert, update, delete on table public.skill_groups to authenticated;
grant select, insert, update, delete on table public.assessment_items to authenticated;
grant select, insert, update, delete on table public.assessment_sessions to authenticated;
grant select, insert, update, delete on table public.assessment_session_items to authenticated;
grant select, insert, update, delete on table public.assessment_summaries to authenticated;

commit;
