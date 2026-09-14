create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ae_rate numeric(10,2) not null default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table session_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz default now()
);

insert into session_types (label) values
  ('Remote Support'),
  ('Entwicklung'),
  ('Beratung'),
  ('Meeting'),
  ('Sonstiges');

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  session_type_id uuid references session_types(id),
  duration_minutes integer not null,
  notes text,
  entry_date date not null default current_date,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table customers enable row level security;
alter table session_types enable row level security;
alter table time_entries enable row level security;

create policy "auth only" on customers for all using (auth.role() = 'authenticated');
create policy "auth only" on session_types for all using (auth.role() = 'authenticated');
create policy "auth only" on time_entries for all using (auth.role() = 'authenticated');

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public;

create trigger customers_updated_at before update on customers for each row execute function update_updated_at();
create trigger time_entries_updated_at before update on time_entries for each row execute function update_updated_at();
