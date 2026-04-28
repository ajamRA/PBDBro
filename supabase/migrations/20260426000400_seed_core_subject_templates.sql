-- Seed default public templates for core subjects (idempotent)
-- Source mapping: legacy pbd-transit-app module groups for BM, BI, Matematik, Sains, PJ, PK, Muzik, Bahasa Arab, PSV.
-- Note: Pendidikan Islam mapping is seeded as practical baseline (legacy app has Tasmik flow, not full PI).

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

  create temporary table tmp_seed_templates (
    template_key text primary key,
    title text not null,
    subject_name text not null,
    year_label text,
    description text
  ) on commit drop;

  insert into tmp_seed_templates (template_key, title, subject_name, year_label, description)
  values
    ('bm', 'Bahasa Melayu (DSKP Asas)', 'BAHASA MELAYU', null, 'Template asas BM: Mendengar/Bertutur, Membaca, Menulis, Seni Bahasa, Tatabahasa.'),
    ('bi', 'Bahasa Inggeris (DSKP Asas)', 'BAHASA INGGERIS', null, 'Template asas BI: Listening, Speaking, Reading, Writing, Language Arts.'),
    ('math', 'Matematik (DSKP Asas)', 'MATEMATIK', null, 'Template asas Matematik: Nombor, Sukatan & Geometri, Perkaitan, Penyelesaian Masalah.'),
    ('sains', 'Sains (DSKP Asas)', 'SAINS', null, 'Template asas Sains: Kemahiran Saintifik, Sains Hayat, Sains Fizikal, Bumi & Angkasa, Aplikasi Sains.'),
    ('pj', 'Pendidikan Jasmani (DSKP Asas)', 'PENDIDIKAN JASMANI', null, 'Template asas PJ: Pergerakan, Kecergasan, Permainan, Nilai & Keselamatan.'),
    ('pk', 'Pendidikan Kesihatan (DSKP Asas)', 'PENDIDIKAN KESIHATAN', null, 'Template asas PK: Kesihatan Diri, Pemakanan, Keselamatan, Kesihatan Sosial.'),
    ('muzik', 'Muzik (DSKP Asas)', 'MUZIK', null, 'Template asas Muzik: Nyanyian, Pergerakan Muzik, Permainan Alat, Kreativiti Muzik.'),
    ('ba', 'Bahasa Arab (DSKP Asas)', 'BAHASA ARAB', null, 'Template asas Bahasa Arab: Istima, Kalam, Qiraah, Kitabah, Mufradat.'),
    ('islam', 'Pendidikan Islam (DSKP Asas)', 'PENDIDIKAN ISLAM', null, 'Template asas PI: Al-Quran, Akidah, Ibadah, Sirah, Jawi, Adab & Akhlak.'),
    ('psv', 'Pendidikan Seni Visual (DSKP Asas)', 'PENDIDIKAN SENI VISUAL', null, 'Template asas PSV: Menggambar, Corak & Rekaan, Binaan, Kraf Tradisional.');

  create temporary table tmp_seed_template_skills (
    template_key text not null,
    skill_name text not null,
    display_order integer not null,
    description text,
    primary key (template_key, skill_name)
  ) on commit drop;

  insert into tmp_seed_template_skills (template_key, skill_name, display_order, description)
  values
    -- BM
    ('bm', 'Mendengar & Bertutur', 1, null),
    ('bm', 'Membaca', 2, null),
    ('bm', 'Menulis', 3, null),
    ('bm', 'Seni Bahasa', 4, null),
    ('bm', 'Tatabahasa', 5, null),

    -- BI
    ('bi', 'Listening', 1, null),
    ('bi', 'Speaking', 2, null),
    ('bi', 'Reading', 3, null),
    ('bi', 'Writing', 4, null),
    ('bi', 'Language Arts', 5, null),

    -- Matematik
    ('math', 'Nombor', 1, null),
    ('math', 'Sukatan & Geometri', 2, null),
    ('math', 'Perkaitan', 3, null),
    ('math', 'Penyelesaian Masalah', 4, null),

    -- Sains
    ('sains', 'Kemahiran Saintifik', 1, null),
    ('sains', 'Sains Hayat', 2, null),
    ('sains', 'Sains Fizikal', 3, null),
    ('sains', 'Bumi & Angkasa', 4, null),
    ('sains', 'Aplikasi Sains', 5, null),

    -- PJ
    ('pj', 'Pergerakan', 1, null),
    ('pj', 'Kecergasan', 2, null),
    ('pj', 'Permainan', 3, null),
    ('pj', 'Nilai & Keselamatan', 4, null),

    -- PK
    ('pk', 'Kesihatan Diri', 1, null),
    ('pk', 'Pemakanan', 2, null),
    ('pk', 'Keselamatan', 3, null),
    ('pk', 'Kesihatan Sosial', 4, null),

    -- Muzik
    ('muzik', 'Nyanyian', 1, null),
    ('muzik', 'Pergerakan Muzik', 2, null),
    ('muzik', 'Permainan Alat', 3, null),
    ('muzik', 'Kreativiti Muzik', 4, null),

    -- Bahasa Arab
    ('ba', 'Istima''', 1, null),
    ('ba', 'Kalam', 2, null),
    ('ba', 'Qiraah', 3, null),
    ('ba', 'Kitabah', 4, null),
    ('ba', 'Mufradat', 5, null),

    -- Pendidikan Islam (baseline)
    ('islam', 'Al-Quran', 1, null),
    ('islam', 'Akidah', 2, null),
    ('islam', 'Ibadah', 3, null),
    ('islam', 'Sirah', 4, null),
    ('islam', 'Jawi', 5, null),
    ('islam', 'Adab & Akhlak', 6, null),

    -- PSV
    ('psv', 'Menggambar', 1, null),
    ('psv', 'Corak & Rekaan', 2, null),
    ('psv', 'Binaan', 3, null),
    ('psv', 'Kraf Tradisional', 4, null);

  for tpl in select * from tmp_seed_templates order by template_key loop
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
    from tmp_seed_template_skills s
    where s.template_key = tpl.template_key
    on conflict (template_id, name) do update
    set
      description = excluded.description,
      display_order = excluded.display_order;
  end loop;
end;
$$;
