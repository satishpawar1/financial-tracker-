-- Description → category lookup table (per household)
-- Descriptions are stored normalized (lowercase, trimmed, collapsed whitespace)
create table category_rules (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  description  text not null,
  category_id  uuid references categories(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (household_id, description)
);

alter table category_rules enable row level security;

create policy "household members can manage category rules"
  on category_rules for all
  using (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());

create index on category_rules (household_id, description);
