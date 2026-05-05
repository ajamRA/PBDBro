-- Seed RBT templates for Tahun 4/5/6 (idempotent)

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

  create temporary table tmp_rbt_templates (
    template_key text primary key,
    title text not null,
    subject_name text not null,
    year_label text not null,
    description text
  ) on commit drop;

  insert into tmp_rbt_templates (template_key, title, subject_name, year_label, description)
  values
    ('rbt_t4', 'RBT Tahun 4 (DSKP Asas)', 'RBT', 'Tahun 4', 'Template asas RBT Tahun 4.'),
    ('rbt_t5', 'RBT Tahun 5 (DSKP Asas)', 'RBT', 'Tahun 5', 'Template asas RBT Tahun 5.'),
    ('rbt_t6', 'RBT Tahun 6 (DSKP Asas)', 'RBT', 'Tahun 6', 'Template asas RBT Tahun 6.');

  create temporary table tmp_rbt_template_skills (
    template_key text not null,
    skill_name text not null,
    display_order integer not null,
    description text,
    primary key (template_key, skill_name)
  ) on commit drop;

  insert into tmp_rbt_template_skills (template_key, skill_name, display_order, description)
  values
    -- Tahun 4
    ('rbt_t4', 'Pengenalan RBT', 1, null),
    ('rbt_t4', 'Reka Bentuk Produk', 2, null),
    ('rbt_t4', 'Penghasilan Projek', 3, null),
    ('rbt_t4', 'Teknologi Asas', 4, null),
    ('rbt_t4', 'Dokumentasi & Pembentangan', 5, null),

    -- Tahun 5
    ('rbt_t5', 'Penyelesaian Masalah Secara Reka Bentuk', 1, null),
    ('rbt_t5', 'Lakaran & Idea Produk', 2, null),
    ('rbt_t5', 'Pembinaan & Ujian Produk', 3, null),
    ('rbt_t5', 'Aplikasi Teknologi', 4, null),
    ('rbt_t5', 'Refleksi & Penambahbaikan', 5, null),

    -- Tahun 6
    ('rbt_t6', 'Proses Reka Bentuk Lengkap', 1, null),
    ('rbt_t6', 'Inovasi Produk', 2, null),
    ('rbt_t6', 'Pengurusan Projek', 3, null),
    ('rbt_t6', 'Teknologi dan Keselamatan', 4, null),
    ('rbt_t6', 'Penilaian Produk Akhir', 5, null);

  for tpl in select * from tmp_rbt_templates order by template_key loop
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
    from tmp_rbt_template_skills s
    where s.template_key = tpl.template_key
    on conflict (template_id, name) do update
    set
      description = excluded.description,
      display_order = excluded.display_order;
  end loop;
end;
$$;
