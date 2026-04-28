begin;

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  class_id uuid not null,
  subject_id uuid not null,
  skill_id uuid not null,
  month_label text not null,
  snapshot_payload jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint fk_report_snapshots_class_workspace
    foreign key (class_id, workspace_id)
    references public.classes(id, workspace_id)
    on delete cascade,
  constraint fk_report_snapshots_subject_workspace
    foreign key (subject_id, workspace_id)
    references public.subjects(id, workspace_id)
    on delete cascade,
  constraint fk_report_snapshots_skill_workspace
    foreign key (skill_id, workspace_id)
    references public.skills(id, workspace_id)
    on delete cascade
);

create index if not exists idx_report_snapshots_workspace_id on public.report_snapshots(workspace_id);
create index if not exists idx_report_snapshots_class_id on public.report_snapshots(class_id);
create index if not exists idx_report_snapshots_subject_id on public.report_snapshots(subject_id);
create index if not exists idx_report_snapshots_skill_id on public.report_snapshots(skill_id);
create index if not exists idx_report_snapshots_created_at on public.report_snapshots(created_at desc);

alter table public.report_snapshots enable row level security;

drop policy if exists "report_snapshots_select_member" on public.report_snapshots;
create policy "report_snapshots_select_member"
on public.report_snapshots
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "report_snapshots_insert_member" on public.report_snapshots;
create policy "report_snapshots_insert_member"
on public.report_snapshots
for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

grant select, insert on table public.report_snapshots to authenticated;

commit;
