-- Seed Sejarah templates for Tahun 4/5/6 (idempotent)

do $$
declare
  v_owner_id uuid;
  v_template_id uuid;
  tpl record;
begin
  select p.id
  into v_owner_id
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_owner_id is null then
    raise notice 'Seed skipped: no profile found.';
    return;
  end if;

  create temporary table tmp_sj_templates (
    template_key text primary key,
    title text not null,
    subject_name text not null,
    year_label text not null,
    description text
  ) on commit drop;

  insert into tmp_sj_templates (template_key, title, subject_name, year_label, description)
  values
    ('sj_t4', 'Sejarah Tahun 4 (DSKP Asas)', 'SEJARAH', 'Tahun 4', 'Template asas Sejarah Tahun 4.'),
    ('sj_t5', 'Sejarah Tahun 5 (DSKP Asas)', 'SEJARAH', 'Tahun 5', 'Template asas Sejarah Tahun 5.'),
    ('sj_t6', 'Sejarah Tahun 6 (DSKP Asas)', 'SEJARAH', 'Tahun 6', 'Template asas Sejarah Tahun 6.');

  create temporary table tmp_sj_template_skills (
    template_key text not null,
    skill_name text not null,
    display_order integer not null,
    description text,
    primary key (template_key, skill_name)
  ) on commit drop;

  insert into tmp_sj_template_skills (template_key, skill_name, display_order, description)
  values
    -- Tahun 4
    ('sj_t4', 'Mengenal Sejarah dan Sumber', 1, null),
    ('sj_t4', 'Identiti Negara', 2, null),
    ('sj_t4', 'Warisan Budaya Malaysia', 3, null),
    ('sj_t4', 'Tokoh dan Peristiwa Penting', 4, null),
    ('sj_t4', 'Nilai Patriotisme', 5, null),

    -- Tahun 5
    ('sj_t5', 'Institusi Raja dan Kerajaan', 1, null),
    ('sj_t5', 'Perjuangan Kemerdekaan', 2, null),
    ('sj_t5', 'Pembentukan Malaysia', 3, null),
    ('sj_t5', 'Kepelbagaian Masyarakat', 4, null),
    ('sj_t5', 'Tanggungjawab Warganegara', 5, null),

    -- Tahun 6
    ('sj_t6', 'Sistem Pentadbiran Negara', 1, null),
    ('sj_t6', 'Hubungan Malaysia dengan Dunia', 2, null),
    ('sj_t6', 'Pembangunan Negara', 3, null),
    ('sj_t6', 'Cabaran dan Masa Depan Negara', 4, null),
    ('sj_t6', 'Semangat Cinta Negara', 5, null);

  for tpl in select * from tmp_sj_templates order by template_key loop
    select st.id
    into v_template_id
    from public.skill_templates st
    where st.title = tpl.title
      and st.subject_name = tpl.subject_name
      and coalesce(st.year_label, '') = coalesce(tpl.year_label, '')
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
        tpl.title,
        tpl.subject_name,
        tpl.year_label,
        tpl.description,
        'public',
        true
      )
      returning id into v_template_id;
    else
      update public.skill_templates
      set
        year_label = tpl.year_label,
        description = tpl.description,
        visibility = 'public',
        is_active = true,
        updated_at = now()
      where id = v_template_id;
    end if;

    insert into public.template_skills (template_id, name, description, display_order)
    select
      v_template_id,
      s.skill_name,
      s.description,
      s.display_order
    from tmp_sj_template_skills s
    where s.template_key = tpl.template_key
    on conflict (template_id, name) do update
    set
      description = excluded.description,
      display_order = excluded.display_order;
  end loop;
end;
$$;
