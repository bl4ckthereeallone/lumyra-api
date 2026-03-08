create table keys (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  used boolean default false,
  hwid text,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);