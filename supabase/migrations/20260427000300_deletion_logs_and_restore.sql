begin;

create table if not exists public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('class')),
  entity_id uuid not null,
  entity_label text,
  payload jsonb not null,
  status text not null default 'deleted' check (status in ('deleted', 'restored')),
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz not null default now(),
  restored_by uuid references public.profiles(id) on delete set null,
  restored_at timestamptz
);

create index if not exists idx_deletion_logs_workspace_id on public.deletion_logs(workspace_id);
create index if not exists idx_deletion_logs_status on public.deletion_logs(status);
create index if not exists idx_deletion_logs_entity on public.deletion_logs(entity_type, entity_id);
create index if not exists idx_deletion_logs_deleted_at on public.deletion_logs(deleted_at desc);

alter table public.deletion_logs enable row level security;

drop policy if exists "deletion_logs_select_member" on public.deletion_logs;
create policy "deletion_logs_select_member"
on public.deletion_logs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "deletion_logs_insert_member" on public.deletion_logs;
create policy "deletion_logs_insert_member"
on public.deletion_logs
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (deleted_by is null or deleted_by = auth.uid())
);

drop policy if exists "deletion_logs_update_member" on public.deletion_logs;
create policy "deletion_logs_update_member"
on public.deletion_logs
for update
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and (restored_by is null or restored_by = auth.uid())
);

grant select, insert, update on table public.deletion_logs to authenticated;

create or replace function public.archive_delete_class(
  p_workspace_id uuid,
  p_class_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes%rowtype;
  v_log_id uuid;
  v_payload jsonb;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Akses ditolak untuk workspace ini.';
  end if;

  select *
  into v_class
  from public.classes c
  where c.id = p_class_id
    and c.workspace_id = p_workspace_id;

  if not found then
    raise exception 'Kelas tidak dijumpai untuk workspace ini.';
  end if;

  v_payload := jsonb_build_object(
    'class', to_jsonb(v_class),
    'students', coalesce(
      (select jsonb_agg(to_jsonb(s))
       from public.students s
       where s.workspace_id = p_workspace_id
         and s.class_id = p_class_id),
      '[]'::jsonb
    ),
    'class_subjects', coalesce(
      (select jsonb_agg(to_jsonb(cs))
       from public.class_subjects cs
       where cs.workspace_id = p_workspace_id
         and cs.class_id = p_class_id),
      '[]'::jsonb
    ),
    'assessments', coalesce(
      (select jsonb_agg(to_jsonb(a))
       from public.assessments a
       where a.workspace_id = p_workspace_id
         and a.class_id = p_class_id),
      '[]'::jsonb
    ),
    'assessment_sessions', coalesce(
      (select jsonb_agg(to_jsonb(ses))
       from public.assessment_sessions ses
       where ses.workspace_id = p_workspace_id
         and ses.class_id = p_class_id),
      '[]'::jsonb
    ),
    'assessment_session_items', coalesce(
      (select jsonb_agg(to_jsonb(asi))
       from public.assessment_session_items asi
       where asi.workspace_id = p_workspace_id
         and asi.session_id in (
           select ses.id
           from public.assessment_sessions ses
           where ses.workspace_id = p_workspace_id
             and ses.class_id = p_class_id
         )),
      '[]'::jsonb
    )
  );

  insert into public.deletion_logs (
    workspace_id,
    entity_type,
    entity_id,
    entity_label,
    payload,
    deleted_by
  )
  values (
    p_workspace_id,
    'class',
    p_class_id,
    format('%s (%s - %s)', v_class.name, v_class.year_label, v_class.academic_year),
    v_payload,
    auth.uid()
  )
  returning id into v_log_id;

  delete from public.assessments
  where workspace_id = p_workspace_id
    and class_id = p_class_id;

  delete from public.assessment_session_items
  where workspace_id = p_workspace_id
    and session_id in (
      select ses.id
      from public.assessment_sessions ses
      where ses.workspace_id = p_workspace_id
        and ses.class_id = p_class_id
    );

  delete from public.assessment_sessions
  where workspace_id = p_workspace_id
    and class_id = p_class_id;

  delete from public.class_subjects
  where workspace_id = p_workspace_id
    and class_id = p_class_id;

  delete from public.students
  where workspace_id = p_workspace_id
    and class_id = p_class_id;

  delete from public.classes
  where workspace_id = p_workspace_id
    and id = p_class_id;

  return v_log_id;
end;
$$;

create or replace function public.restore_deleted_class(
  p_workspace_id uuid,
  p_log_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.deletion_logs%rowtype;
  v_class_id uuid;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Akses ditolak untuk workspace ini.';
  end if;

  select *
  into v_log
  from public.deletion_logs dl
  where dl.id = p_log_id
    and dl.workspace_id = p_workspace_id
    and dl.entity_type = 'class'
    and dl.status = 'deleted'
  for update;

  if not found then
    raise exception 'Log restore tidak dijumpai atau sudah dipulihkan.';
  end if;

  v_class_id := (v_log.payload -> 'class' ->> 'id')::uuid;

  if exists (
    select 1
    from public.classes c
    where c.id = v_class_id
      and c.workspace_id = p_workspace_id
  ) then
    raise exception 'Kelas asal sudah wujud. Restore dibatalkan.';
  end if;

  insert into public.classes (
    id,
    workspace_id,
    name,
    year_label,
    academic_year,
    created_by,
    created_at,
    updated_at
  )
  select
    x.id,
    x.workspace_id,
    x.name,
    x.year_label,
    x.academic_year,
    x.created_by,
    x.created_at,
    x.updated_at
  from jsonb_to_record(v_log.payload -> 'class') as x(
    id uuid,
    workspace_id uuid,
    name text,
    year_label text,
    academic_year text,
    created_by uuid,
    created_at timestamptz,
    updated_at timestamptz
  );

  insert into public.students (
    id,
    workspace_id,
    class_id,
    full_name,
    student_no,
    gender,
    created_by,
    created_at,
    updated_at
  )
  select
    x.id,
    x.workspace_id,
    x.class_id,
    x.full_name,
    x.student_no,
    x.gender,
    x.created_by,
    x.created_at,
    x.updated_at
  from jsonb_to_recordset(v_log.payload -> 'students') as x(
    id uuid,
    workspace_id uuid,
    class_id uuid,
    full_name text,
    student_no text,
    gender text,
    created_by uuid,
    created_at timestamptz,
    updated_at timestamptz
  )
  on conflict (id) do nothing;

  insert into public.class_subjects (
    id,
    workspace_id,
    class_id,
    subject_id,
    created_by,
    created_at
  )
  select
    x.id,
    x.workspace_id,
    x.class_id,
    x.subject_id,
    x.created_by,
    x.created_at
  from jsonb_to_recordset(v_log.payload -> 'class_subjects') as x(
    id uuid,
    workspace_id uuid,
    class_id uuid,
    subject_id uuid,
    created_by uuid,
    created_at timestamptz
  )
  on conflict (class_id, subject_id) do nothing;

  insert into public.assessment_sessions (
    id,
    workspace_id,
    class_id,
    subject_id,
    student_id,
    session_date,
    term_label,
    notes,
    recorded_by,
    created_at,
    updated_at
  )
  select
    x.id,
    x.workspace_id,
    x.class_id,
    x.subject_id,
    x.student_id,
    x.session_date,
    x.term_label,
    x.notes,
    x.recorded_by,
    x.created_at,
    x.updated_at
  from jsonb_to_recordset(v_log.payload -> 'assessment_sessions') as x(
    id uuid,
    workspace_id uuid,
    class_id uuid,
    subject_id uuid,
    student_id uuid,
    session_date date,
    term_label text,
    notes text,
    recorded_by uuid,
    created_at timestamptz,
    updated_at timestamptz
  )
  on conflict (id) do nothing;

  insert into public.assessment_session_items (
    id,
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
    x.id,
    x.workspace_id,
    x.session_id,
    x.assessment_item_id,
    x.mastery_level::public.mastery_level_enum,
    x.evidence,
    x.note,
    x.recorded_by,
    x.recorded_at,
    x.created_at,
    x.updated_at
  from jsonb_to_recordset(v_log.payload -> 'assessment_session_items') as x(
    id uuid,
    workspace_id uuid,
    session_id uuid,
    assessment_item_id uuid,
    mastery_level text,
    evidence text,
    note text,
    recorded_by uuid,
    recorded_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
  )
  on conflict (id) do nothing;

  insert into public.assessments (
    id,
    workspace_id,
    class_id,
    student_id,
    subject_id,
    skill_id,
    mastery_level,
    score,
    note,
    evidence,
    recorded_at,
    recorded_by,
    created_at,
    updated_at
  )
  select
    x.id,
    x.workspace_id,
    x.class_id,
    x.student_id,
    x.subject_id,
    x.skill_id,
    x.mastery_level::public.mastery_level_enum,
    x.score,
    x.note,
    x.evidence,
    x.recorded_at,
    x.recorded_by,
    x.created_at,
    x.updated_at
  from jsonb_to_recordset(v_log.payload -> 'assessments') as x(
    id uuid,
    workspace_id uuid,
    class_id uuid,
    student_id uuid,
    subject_id uuid,
    skill_id uuid,
    mastery_level text,
    score numeric(5,2),
    note text,
    evidence text,
    recorded_at date,
    recorded_by uuid,
    created_at timestamptz,
    updated_at timestamptz
  )
  on conflict (class_id, subject_id, student_id, skill_id, recorded_at) do nothing;

  update public.deletion_logs
  set
    status = 'restored',
    restored_at = now(),
    restored_by = auth.uid()
  where id = v_log.id;

  return v_class_id;
end;
$$;

grant execute on function public.archive_delete_class(uuid, uuid) to authenticated;
grant execute on function public.restore_deleted_class(uuid, uuid) to authenticated;

commit;
