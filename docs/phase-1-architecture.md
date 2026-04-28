# FASA 1 - Architecture & Database (PBD App)

## 1) Cadangan Folder Structure Projek (Next.js + TS + Tailwind + Supabase)

```text
.
|- src/
|  |- app/
|  |  |- (auth)/
|  |  |  |- login/page.tsx
|  |  |  |- daftar/page.tsx
|  |  |- (dashboard)/
|  |  |  |- layout.tsx
|  |  |  |- fail-saya/page.tsx
|  |  |  |- workspace/[workspaceId]/
|  |  |  |  |- classes/page.tsx
|  |  |  |  |- subjects/page.tsx
|  |  |  |  |- students/page.tsx
|  |  |  |  |- assessments/page.tsx
|  |  |  |  |- templates/page.tsx
|  |  |- api/
|  |  |  |- upload-students/route.ts
|  |  |  |- demo-mode/route.ts
|  |  |- layout.tsx
|  |  |- page.tsx
|  |- components/
|  |  |- ui/
|  |  |- forms/
|  |  |- pbd/
|  |- lib/
|  |  |- supabase/
|  |  |  |- client.ts
|  |  |  |- server.ts
|  |  |- auth/
|  |  |- repositories/
|  |  |  |- classes.repo.ts
|  |  |  |- students.repo.ts
|  |  |  |- subjects.repo.ts
|  |  |  |- skills.repo.ts
|  |  |  |- assessments.repo.ts
|  |  |- demo/
|  |  |  |- demo-storage.ts
|  |  |  |- demo-seed.ts
|  |- types/
|  |  |- db.ts
|  |  |- domain.ts
|  |- hooks/
|  |- utils/
|- supabase/
|  |- migrations/
|  |  |- 20260426_001_init_pbd_schema.sql
|  |- seed/
|  |  |- 20260426_001_seed_pbd.sql
|- docs/
|  |- phase-1-architecture.md
```

## 2) Reka bentuk data (ringkas)

- `profiles`: maklumat guru login (identity utama dari `auth.users`).
- `workspaces`: ruang kerja personal guru.
- `workspace_members`: membership + role.
- `classes`: kelas dalam workspace.
- `students`: murid milik workspace (enforce sama workspace dengan class).
- `subjects`: subjek milik workspace.
- `skills`: kemahiran ikut subjek.
- `assessments`: rekod PBD (`mastery_level_enum` TP1-TP6, nota/eviden, tarikh).
- `skill_templates`: template kemahiran (private/public).
- `template_skills`: item kemahiran dalam template.

## 3) Guardrail penting yang dah dipasang

1. Konsistensi workspace:
   - `students (class_id, workspace_id)` -> `classes (id, workspace_id)`
   - Jadi `student.workspace_id` mesti sama dengan `class.workspace_id`.
2. Elak duplicate rekod pentaksiran:
   - `assessments` ada `unique (student_id, skill_id)`.
3. TP standard:
   - guna enum `mastery_level_enum` (`TP1`..`TP6`).
4. Signup automation flow:
   - `auth.users` insert -> auto `profiles` -> auto `workspaces` -> auto `workspace_members(owner)`.
5. Template copy logic:
   - template public/private hanya sumber.
   - bila copy, data `template_skills` di-`clone` ke `skills` workspace (guna fungsi `copy_template_to_subject`).
   - tiada live-link ke template asal.

## 4) Plan fasa pembangunan selepas FASA 1

- FASA 2: setup app Next.js penuh + Supabase Auth + bootstrap session/workspace.
- FASA 3: CRUD kelas/murid/subjek/kemahiran + import Excel nama murid.
- FASA 4: modul pentaksiran penuh + auto-calc TP + auto-save.
- FASA 5: template sharing + history log ringan + hardening RLS lanjutan.