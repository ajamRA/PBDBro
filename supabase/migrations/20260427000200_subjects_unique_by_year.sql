-- Allow same subject name across different year_label in the same workspace.
-- Example: "Sains | Tahun 1" and "Sains | Tahun 3" are both valid.

alter table public.subjects
drop constraint if exists subjects_workspace_id_name_key;

drop index if exists public.uq_subjects_workspace_name_year_norm;

create unique index if not exists uq_subjects_workspace_name_year_norm
on public.subjects (
  workspace_id,
  lower(trim(name)),
  coalesce(lower(trim(year_label)), '')
);
