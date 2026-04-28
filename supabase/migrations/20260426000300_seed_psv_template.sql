-- Seed default public template for PSV Tahun 2
-- Idempotent and safe: will skip if no profile exists yet.

do $$
declare
  v_owner_id uuid;
  v_template_id uuid;
begin
  select p.id
  into v_owner_id
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_owner_id is null then
    raise notice 'Seed PSV template skipped: no profile found.';
    return;
  end if;

  select st.id
  into v_template_id
  from public.skill_templates st
  where st.title = 'Pendidikan Seni Visual Tahun 2'
    and st.subject_name = 'PSV'
    and coalesce(st.year_label, '') = 'Tahun 2'
  limit 1;

  if v_template_id is null then
    insert into public.skill_templates (
      owner_id,
      title,
      subject_name,
      year_label,
      description,
      visibility,
      is_active
    )
    values (
      v_owner_id,
      'Pendidikan Seni Visual Tahun 2',
      'PSV',
      'Tahun 2',
      'Template asas DSKP PSV Tahun 2 untuk jana kemahiran.',
      'public',
      true
    )
    returning id into v_template_id;
  else
    update public.skill_templates
    set
      year_label = 'Tahun 2',
      visibility = 'public',
      is_active = true,
      updated_at = now()
    where id = v_template_id;
  end if;

  insert into public.template_skills (template_id, name, description, display_order)
  values
    (v_template_id, 'Bahasa Seni', null, 1),
    (v_template_id, 'Kemahiran Seni', null, 2),
    (v_template_id, 'Kreativiti', null, 3),
    (v_template_id, 'Apresiasi Seni', null, 4)
  on conflict (template_id, name) do update
  set
    description = excluded.description,
    display_order = excluded.display_order;
end;
$$;
