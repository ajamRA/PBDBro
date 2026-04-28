begin;

-- Add year-specific support for skill templates.
alter table public.skill_templates
  add column if not exists year_label text;

create index if not exists idx_skill_templates_subject_year
  on public.skill_templates(subject_name, year_label);

-- Backfill known seeded template.
update public.skill_templates
set year_label = 'Tahun 2',
    updated_at = now()
where year_label is null
  and title = 'Pendidikan Seni Visual Tahun 2'
  and upper(subject_name) in ('PSV', 'PENDIDIKAN SENI VISUAL');

-- Optional heuristic backfill from title text like "Tahun 3".
with inferred as (
  select
    st.id,
    regexp_replace(
      (regexp_match(lower(st.title), '(tahun\\s*[1-6])'))[1],
      '\\s+',
      ' ',
      'g'
    ) as inferred_year
  from public.skill_templates st
  where st.year_label is null
    and lower(st.title) ~ 'tahun\\s*[1-6]'
)
update public.skill_templates st
set year_label = initcap(i.inferred_year),
    updated_at = now()
from inferred i
where st.id = i.id
  and i.inferred_year is not null;

commit;

