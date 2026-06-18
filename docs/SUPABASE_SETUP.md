# Supabase destination — one-time table setup

Three steps, two-minute total.

## 1. Create the table

Open your Supabase project → SQL Editor → paste + Run:

```sql
-- Minimum table required by createSupabaseHandler.
-- pgcrypto is needed for gen_random_uuid().
create extension if not exists pgcrypto;

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  payload    jsonb not null,
  origin     text,
  created_at timestamptz not null default now()
);

-- Lock it down — nobody can read/write via the anon key.
-- The server uses the service-role key, which bypasses RLS by design.
alter table public.feedback enable row level security;

-- Indexes that pay off as you get real volume.
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_payload_severity_idx
  on public.feedback ((payload->>'severity'));
create index if not exists feedback_payload_type_idx
  on public.feedback ((payload->>'type'));
```

## 2. Get the credentials

Either run:

```bash
npx rvf auth supabase
```

which opens supabase.com/dashboard/account/tokens, asks you to paste a
PAT, then lets you pick the project — it writes `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` to `.env.local` automatically.

Or do it manually:
- `SUPABASE_URL` — Project Settings → API → "Project URL"
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → "service_role" key  
  ⚠️ **Server-only.** Never ship to the browser. `.env.local` (not `.env`) so
  Next won't expose it.
- `SUPABASE_FEEDBACK_TABLE` (optional, defaults to `feedback`).

## 3. Restart your dev server

Env-var changes don't hot-reload. Then press `Alt+A` to file feedback.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `500: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` | env not loaded | restart dev server after editing `.env.local` |
| `supabase 404: relation "feedback" does not exist` | table not created | run the SQL above |
| `supabase 401: Invalid API key` | wrong key | confirm the service_role key, not anon |
| `supabase 42501: new row violates row-level security policy` | using anon key, not service_role | the handler must use service_role; check env |

## What goes into the table

The handler inserts one row per submission with this shape:

```json
{
  "id": "auto-generated uuid",
  "origin": "https://your-app.com",
  "created_at": "2026-06-18T12:34:56Z",
  "payload": {
    "feedback": "Pay button does nothing on /checkout",
    "type": "bug",
    "severity": "P1",
    "labels": ["ui"],
    "screenshot": "data:image/webp;base64,...",
    "videoBlob": "<binary, omitted from JSON path>",
    "audioBlob": "<binary, voice memo>",
    "url": "https://your-app.com/checkout",
    "userName": "alice",
    "userEmail": "alice@acme.com",
    "elementInfo": { "...React component snapshot..." },
    "aiTicket": { "markdown": "# Bug\n..." }
  }
}
```

To query: `select payload->>'severity' as severity, count(*) from feedback group by 1;`
