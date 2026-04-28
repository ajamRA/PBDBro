# Supabase Setup (FASA 1)

## Jalankan migration

1. Install Supabase CLI.
2. Login: `supabase login`
3. Link project: `supabase link --project-ref <PROJECT_REF>`
4. Push schema: `supabase db push`

## Jalankan seed

Opsyen A (SQL Editor Supabase):
- Copy fail `supabase/seed/20260426_001_seed_pbd.sql` dan run di SQL Editor.

Opsyen B (CLI + psql):
- `supabase db reset` (untuk local dev)
- atau execute manual ke database target guna psql.

Nota penting:
- Seed perlukan sekurang-kurangnya 1 user dalam `auth.users`.
- Kalau belum ada user, daftar akaun dulu melalui Supabase Auth.