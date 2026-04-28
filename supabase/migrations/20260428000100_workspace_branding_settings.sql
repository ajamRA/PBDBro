create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  logo_url text,
  school_name text,
  report_title text not null default 'Perkembangan Murid (Jadual Bulanan)',
  report_subtitle text,
  header_line_1 text,
  header_line_2 text,
  footer_note text,
  primary_color text not null default '#0f1d3c',
  accent_color text not null default '#ff8e2b',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_workspace_settings_primary_hex
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint chk_workspace_settings_accent_hex
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists idx_workspace_settings_workspace_id
  on public.workspace_settings(workspace_id);

drop trigger if exists trg_workspace_settings_updated_at on public.workspace_settings;
create trigger trg_workspace_settings_updated_at
before update on public.workspace_settings
for each row
execute function public.set_updated_at();

alter table public.workspace_settings enable row level security;

drop policy if exists "workspace_settings_select_member" on public.workspace_settings;
create policy "workspace_settings_select_member"
on public.workspace_settings
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_settings_insert_member" on public.workspace_settings;
create policy "workspace_settings_insert_member"
on public.workspace_settings
for insert
with check (
  public.is_workspace_member(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "workspace_settings_update_member" on public.workspace_settings;
create policy "workspace_settings_update_member"
on public.workspace_settings
for update
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_settings_delete_member" on public.workspace_settings;
create policy "workspace_settings_delete_member"
on public.workspace_settings
for delete
using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on table public.workspace_settings to authenticated;
