create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Enum
-- ------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'mastery_level_enum'
  ) then
    create type public.mastery_level_enum as enum ('TP1','TP2','TP3','TP4','TP5','TP6');
  end if;
end $$;

-- ------------------------------------------------------------------
-- Utility trigger function
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  school_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'teacher' check (role in ('owner', 'teacher')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  year_label text not null,
  academic_year text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name, academic_year),
  unique (id, workspace_id)
);

create index if not exists idx_classes_workspace_id on public.classes(workspace_id);

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at
before update on public.classes
for each row
execute function public.set_updated_at();

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid,
  full_name text not null,
  student_no text,
  gender text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  constraint fk_students_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete restrict
);

create index if not exists idx_students_workspace_id on public.students(workspace_id);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_students_name on public.students(full_name);

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text,
  year_label text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index if not exists idx_subjects_workspace_id on public.subjects(workspace_id);
create unique index if not exists uq_subjects_workspace_name_year_norm
on public.subjects (
  workspace_id,
  lower(trim(name)),
  coalesce(lower(trim(year_label)), '')
);

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
before update on public.subjects
for each row
execute function public.set_updated_at();

create table if not exists public.skill_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject_name text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_skill_templates_owner_id on public.skill_templates(owner_id);
create index if not exists idx_skill_templates_visibility on public.skill_templates(visibility);

drop trigger if exists trg_skill_templates_updated_at on public.skill_templates;
create trigger trg_skill_templates_updated_at
before update on public.skill_templates
for each row
execute function public.set_updated_at();

create table if not exists public.template_skills (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.skill_templates(id) on delete cascade,
  name text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (template_id, name)
);

create index if not exists idx_template_skills_template_id on public.template_skills(template_id);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid not null,
  name text not null,
  code text,
  description text,
  display_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, name),
  unique (id, workspace_id),
  unique (id, subject_id),
  constraint fk_skills_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade
);

create index if not exists idx_skills_workspace_id on public.skills(workspace_id);
create index if not exists idx_skills_subject_id on public.skills(subject_id);

drop trigger if exists trg_skills_updated_at on public.skills;
create trigger trg_skills_updated_at
before update on public.skills
for each row
execute function public.set_updated_at();

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid,
  student_id uuid not null,
  subject_id uuid not null,
  skill_id uuid not null,
  mastery_level public.mastery_level_enum not null,
  score numeric(5,2),
  note text,
  evidence text,
  recorded_at date not null default current_date,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_assessments_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete restrict,
  constraint fk_assessments_student_workspace
    foreign key (student_id, workspace_id)
    references public.students(id, workspace_id)
    on delete cascade,
  constraint fk_assessments_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,
  constraint fk_assessments_skill_workspace
    foreign key (skill_id, workspace_id)
    references public.skills(id, workspace_id)
    on delete cascade,
  constraint fk_assessments_skill_subject
    foreign key (skill_id, subject_id)
    references public.skills(id, subject_id)
    on delete cascade
);

create index if not exists idx_assessments_workspace_id on public.assessments(workspace_id);
create index if not exists idx_assessments_student_id on public.assessments(student_id);
create index if not exists idx_assessments_subject_id on public.assessments(subject_id);
create index if not exists idx_assessments_skill_id on public.assessments(skill_id);
create index if not exists idx_assessments_recorded_at on public.assessments(recorded_at);

drop trigger if exists trg_assessments_updated_at on public.assessments;
create trigger trg_assessments_updated_at
before update on public.assessments
for each row
execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Access helper functions and automation triggers
-- ------------------------------------------------------------------
create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workspaces w
    where w.id = ws_id
      and w.owner_id = auth.uid()
  );
end;
$$;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
  or public.is_workspace_owner(ws_id);
end;
$$;

create or replace function public.handle_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_workspace_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_workspace_name := format('Workspace %s', v_display_name);

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, v_display_name)
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  insert into public.workspaces (owner_id, name, is_demo)
  values (new.id, v_workspace_name, false)
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.copy_template_to_subject(
  p_template_id uuid,
  p_workspace_id uuid,
  p_subject_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Akses ditolak untuk workspace ini.';
  end if;

  if not exists (
    select 1
    from public.subjects s
    where s.id = p_subject_id
      and s.workspace_id = p_workspace_id
  ) then
    raise exception 'Subject tidak sah untuk workspace ini.';
  end if;

  if not exists (
    select 1
    from public.skill_templates st
    where st.id = p_template_id
      and (st.visibility = 'public' or st.owner_id = auth.uid())
  ) then
    raise exception 'Template tidak boleh diakses.';
  end if;

  insert into public.skills (
    workspace_id,
    subject_id,
    name,
    description,
    display_order,
    created_by
  )
  select
    p_workspace_id,
    p_subject_id,
    ts.name,
    ts.description,
    ts.display_order,
    auth.uid()
  from public.template_skills ts
  where ts.template_id = p_template_id
  on conflict (subject_id, name) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

grant execute on function public.copy_template_to_subject(uuid, uuid, uuid) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists trg_workspace_owner_membership on public.workspaces;
create trigger trg_workspace_owner_membership
after insert on public.workspaces
for each row
execute function public.handle_workspace_owner_membership();

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.skills enable row level security;
alter table public.assessments enable row level security;
alter table public.skill_templates enable row level security;
alter table public.template_skills enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- workspaces
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
on public.workspaces
for select
using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner"
on public.workspaces
for insert
with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner"
on public.workspaces
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner"
on public.workspaces
for delete
using (owner_id = auth.uid());

-- workspace_members
drop policy if exists "workspace_members_select_owner_or_self" on public.workspace_members;
create policy "workspace_members_select_owner_or_self"
on public.workspace_members
for select
using (
  user_id = auth.uid()
  or public.is_workspace_owner(workspace_id)
);

drop policy if exists "workspace_members_insert_owner" on public.workspace_members;
create policy "workspace_members_insert_owner"
on public.workspace_members
for insert
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "workspace_members_update_owner" on public.workspace_members;
create policy "workspace_members_update_owner"
on public.workspace_members
for update
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "workspace_members_delete_owner" on public.workspace_members;
create policy "workspace_members_delete_owner"
on public.workspace_members
for delete
using (public.is_workspace_owner(workspace_id));

-- classes
drop policy if exists "classes_select_member" on public.classes;
create policy "classes_select_member"
on public.classes
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "classes_insert_member" on public.classes;
create policy "classes_insert_member"
on public.classes
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "classes_update_member" on public.classes;
create policy "classes_update_member"
on public.classes
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "classes_delete_member" on public.classes;
create policy "classes_delete_member"
on public.classes
for delete
using (public.is_workspace_member(workspace_id));

-- students
drop policy if exists "students_select_member" on public.students;
create policy "students_select_member"
on public.students
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "students_insert_member" on public.students;
create policy "students_insert_member"
on public.students
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "students_update_member" on public.students;
create policy "students_update_member"
on public.students
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "students_delete_member" on public.students;
create policy "students_delete_member"
on public.students
for delete
using (public.is_workspace_member(workspace_id));

-- subjects
drop policy if exists "subjects_select_member" on public.subjects;
create policy "subjects_select_member"
on public.subjects
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "subjects_insert_member" on public.subjects;
create policy "subjects_insert_member"
on public.subjects
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "subjects_update_member" on public.subjects;
create policy "subjects_update_member"
on public.subjects
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "subjects_delete_member" on public.subjects;
create policy "subjects_delete_member"
on public.subjects
for delete
using (public.is_workspace_member(workspace_id));

-- skills
drop policy if exists "skills_select_member" on public.skills;
create policy "skills_select_member"
on public.skills
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "skills_insert_member" on public.skills;
create policy "skills_insert_member"
on public.skills
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "skills_update_member" on public.skills;
create policy "skills_update_member"
on public.skills
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "skills_delete_member" on public.skills;
create policy "skills_delete_member"
on public.skills
for delete
using (public.is_workspace_member(workspace_id));

-- assessments
drop policy if exists "assessments_select_member" on public.assessments;
create policy "assessments_select_member"
on public.assessments
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "assessments_insert_member" on public.assessments;
create policy "assessments_insert_member"
on public.assessments
for insert
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.skills sk
    where sk.id = skill_id
      and sk.workspace_id = workspace_id
      and sk.subject_id = subject_id
  )
  and (
    class_id is null
    or exists (
      select 1
      from public.classes c
      where c.id = class_id
        and c.workspace_id = workspace_id
    )
  )
);

drop policy if exists "assessments_update_member" on public.assessments;
create policy "assessments_update_member"
on public.assessments
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and recorded_by = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.subjects subj
    where subj.id = subject_id
      and subj.workspace_id = workspace_id
  )
  and exists (
    select 1
    from public.skills sk
    where sk.id = skill_id
      and sk.workspace_id = workspace_id
      and sk.subject_id = subject_id
  )
  and (
    class_id is null
    or exists (
      select 1
      from public.classes c
      where c.id = class_id
        and c.workspace_id = workspace_id
    )
  )
);

drop policy if exists "assessments_delete_member" on public.assessments;
create policy "assessments_delete_member"
on public.assessments
for delete
using (public.is_workspace_member(workspace_id));

-- skill_templates
drop policy if exists "skill_templates_select_public_or_owner" on public.skill_templates;
create policy "skill_templates_select_public_or_owner"
on public.skill_templates
for select
using (
  visibility = 'public'
  or owner_id = auth.uid()
);

drop policy if exists "skill_templates_insert_owner" on public.skill_templates;
create policy "skill_templates_insert_owner"
on public.skill_templates
for insert
with check (owner_id = auth.uid());

drop policy if exists "skill_templates_update_owner" on public.skill_templates;
create policy "skill_templates_update_owner"
on public.skill_templates
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "skill_templates_delete_owner" on public.skill_templates;
create policy "skill_templates_delete_owner"
on public.skill_templates
for delete
using (owner_id = auth.uid());

-- template_skills
drop policy if exists "template_skills_select_public_or_owner" on public.template_skills;
create policy "template_skills_select_public_or_owner"
on public.template_skills
for select
using (
  exists (
    select 1
    from public.skill_templates st
    where st.id = template_id
      and (st.visibility = 'public' or st.owner_id = auth.uid())
  )
);

drop policy if exists "template_skills_insert_owner" on public.template_skills;
create policy "template_skills_insert_owner"
on public.template_skills
for insert
with check (
  exists (
    select 1
    from public.skill_templates st
    where st.id = template_id
      and st.owner_id = auth.uid()
  )
);

drop policy if exists "template_skills_update_owner" on public.template_skills;
create policy "template_skills_update_owner"
on public.template_skills
for update
using (
  exists (
    select 1
    from public.skill_templates st
    where st.id = template_id
      and st.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.skill_templates st
    where st.id = template_id
      and st.owner_id = auth.uid()
  )
);

drop policy if exists "template_skills_delete_owner" on public.template_skills;
create policy "template_skills_delete_owner"
on public.template_skills
for delete
using (
  exists (
    select 1
    from public.skill_templates st
    where st.id = template_id
      and st.owner_id = auth.uid()
  )
);

-- ------------------------------------------------------------------
-- Grants (required before RLS can evaluate policies)
-- ------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.classes to authenticated;
grant select, insert, update, delete on table public.students to authenticated;
grant select, insert, update, delete on table public.subjects to authenticated;
grant select, insert, update, delete on table public.skills to authenticated;
grant select, insert, update, delete on table public.assessments to authenticated;
grant select, insert, update, delete on table public.skill_templates to authenticated;
grant select, insert, update, delete on table public.template_skills to authenticated;
