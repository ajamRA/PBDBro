-- FASA 1 seed data (requires at least 1 user in auth.users)

do $$
declare
  v_user_id uuid;
  v_workspace_id uuid;
  v_class_id uuid;
  v_subject_bm uuid;
  v_subject_mt uuid;
  v_student_1 uuid;
  v_student_2 uuid;
  v_student_3 uuid;
  v_skill_bm_1 uuid;
  v_skill_bm_2 uuid;
  v_skill_mt_1 uuid;
  v_template_id uuid;
begin
  select id into v_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'Tiada user dalam auth.users. Sila daftar 1 akaun dulu.';
  end if;

  insert into public.profiles (id, email, display_name, school_name)
  values (v_user_id, 'guru.demo@contoh.com', 'Guru Demo', 'SK Contoh')
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    school_name = excluded.school_name;

  insert into public.workspaces (owner_id, name, slug, is_demo)
  values (v_user_id, 'Workspace PBD Demo', 'workspace-pbd-demo', true)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace_id, v_user_id, 'owner', 'active')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.classes (workspace_id, name, year_label, academic_year, created_by)
  values (v_workspace_id, '5 Cemerlang', 'Tahun 5', '2026', v_user_id)
  returning id into v_class_id;

  insert into public.students (workspace_id, class_id, full_name, student_no, gender, created_by)
  values
    (v_workspace_id, v_class_id, 'Aisyah Binti Ahmad', '01', 'P', v_user_id),
    (v_workspace_id, v_class_id, 'Daniel Bin Roslan', '02', 'L', v_user_id),
    (v_workspace_id, v_class_id, 'Haziq Bin Kamal', '03', 'L', v_user_id);

  select id into v_student_1 from public.students where workspace_id = v_workspace_id and full_name = 'Aisyah Binti Ahmad' limit 1;
  select id into v_student_2 from public.students where workspace_id = v_workspace_id and full_name = 'Daniel Bin Roslan' limit 1;
  select id into v_student_3 from public.students where workspace_id = v_workspace_id and full_name = 'Haziq Bin Kamal' limit 1;

  insert into public.subjects (workspace_id, name, code, year_label, created_by)
  values
    (v_workspace_id, 'Bahasa Melayu', 'BM', 'Tahun 5', v_user_id),
    (v_workspace_id, 'Matematik', 'MT', 'Tahun 5', v_user_id);

  select id into v_subject_bm from public.subjects where workspace_id = v_workspace_id and name = 'Bahasa Melayu' limit 1;
  select id into v_subject_mt from public.subjects where workspace_id = v_workspace_id and name = 'Matematik' limit 1;

  insert into public.skills (workspace_id, subject_id, name, code, description, display_order, created_by)
  values
    (v_workspace_id, v_subject_bm, 'Membaca dan memahami petikan', 'BM-K1', 'Murid faham isi utama petikan.', 1, v_user_id),
    (v_workspace_id, v_subject_bm, 'Menulis ayat gramatis', 'BM-K2', 'Murid bina ayat dengan struktur betul.', 2, v_user_id),
    (v_workspace_id, v_subject_mt, 'Operasi tambah dan tolak', 'MT-K1', 'Murid selesaikan operasi asas dengan tepat.', 1, v_user_id),
    (v_workspace_id, v_subject_mt, 'Penyelesaian masalah harian', 'MT-K2', 'Murid guna strategi sesuai untuk soalan berayat.', 2, v_user_id);

  select id into v_skill_bm_1 from public.skills where workspace_id = v_workspace_id and code = 'BM-K1' limit 1;
  select id into v_skill_bm_2 from public.skills where workspace_id = v_workspace_id and code = 'BM-K2' limit 1;
  select id into v_skill_mt_1 from public.skills where workspace_id = v_workspace_id and code = 'MT-K1' limit 1;

  insert into public.assessments (
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
    recorded_by
  )
  values
    (v_workspace_id, v_class_id, v_student_1, v_subject_bm, v_skill_bm_1, 'TP4', 74.00, 'Boleh jawab dengan baik, perlu lebih yakin.', 'Buku aktiviti muka surat 12', current_date, v_user_id),
    (v_workspace_id, v_class_id, v_student_2, v_subject_mt, v_skill_mt_1, 'TP3', 62.00, 'Masih perlukan bimbingan untuk soalan berayat.', 'Lembaran kerja minggu 3', current_date, v_user_id),
    (v_workspace_id, v_class_id, v_student_3, v_subject_bm, v_skill_bm_2, 'TP5', 85.00, 'Ayat lengkap dan gramatis.', 'Penulisan karangan ringkas', current_date, v_user_id);

  insert into public.skill_templates (owner_id, title, subject_name, description, visibility)
  values (v_user_id, 'Template Asas BM Tahun 5', 'Bahasa Melayu', 'Template kemahiran asas untuk borang transit BM.', 'public')
  returning id into v_template_id;

  insert into public.template_skills (template_id, name, description, display_order)
  values
    (v_template_id, 'Membaca dan memahami petikan', 'Kenal isi tersurat dan tersirat ringkas.', 1),
    (v_template_id, 'Menulis ayat gramatis', 'Bina ayat betul dengan tanda baca sesuai.', 2);

end $$;