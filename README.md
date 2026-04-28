# PBD App (FASA 2)

Flow aktif sekarang: `login -> dashboard -> classes list`.

## Setup

1. Install dependency
```bash
npm install
```
2. Buat fail `.env.local` berdasarkan `.env.example`
```bash
copy .env.example .env.local
```
3. Isi nilai sebenar Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Run

```bash
npm run dev
```

Buka: `http://localhost:3000`

## Route tersedia

- `/login`
- `/signup`
- `/dashboard`

## Verify ringkas

1. Signup akaun baru.
2. Login.
3. Masuk dashboard dan semak:
- Current user dipaparkan
- Workspace dipaparkan (auto-create trigger)
- Senarai kelas (empty state atau data sedia ada)
