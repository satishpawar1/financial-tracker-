-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- households
-- ─────────────────────────────────────────────
create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- household_members
-- ─────────────────────────────────────────────
create table household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  unique (user_id)
);

create index on household_members (household_id, user_id);

-- ─────────────────────────────────────────────
-- household_invites
-- ─────────────────────────────────────────────
create table household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code         text not null unique,
  used_by      uuid references auth.users(id),
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────
create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null default '#6366f1',
  icon         text not null default 'tag',
  is_system    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index on categories (household_id);

-- ─────────────────────────────────────────────
-- import_batches
-- ─────────────────────────────────────────────
create table import_batches (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  imported_by  uuid not null references auth.users(id),
  source       text not null check (source in ('csv', 'pdf', 'excel')),
  filename     text,
  row_count    int not null default 0,
  skipped      int not null default 0,
  created_at   timestamptz not null default now()
);

create index on import_batches (household_id);

-- ─────────────────────────────────────────────
-- recurring_rules
-- ─────────────────────────────────────────────
create table recurring_rules (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  paid_by        uuid not null references household_members(id),
  category_id    uuid references categories(id) on delete set null,
  amount         numeric(12,2) not null check (amount > 0),
  description    text not null,
  is_income      boolean not null default false,
  frequency      text not null check (frequency in ('daily','weekly','monthly','yearly')),
  day_of_week    int check (day_of_week between 0 and 6),
  day_of_month   int check (day_of_month between 1 and 31),
  month_of_year  int check (month_of_year between 1 and 12),
  start_date     date not null,
  end_date       date,
  last_generated date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create index on recurring_rules (household_id);
create index on recurring_rules (is_active, last_generated);

-- ─────────────────────────────────────────────
-- transactions
-- ─────────────────────────────────────────────
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households(id) on delete cascade,
  paid_by          uuid not null references household_members(id),
  category_id      uuid references categories(id) on delete set null,
  amount           numeric(12,2) not null check (amount > 0),
  description      text not null,
  transaction_date date not null,
  is_income        boolean not null default false,
  notes            text,
  import_source    text check (import_source in ('csv', 'pdf', 'excel')),
  import_batch_id  uuid references import_batches(id) on delete set null,
  recurring_id     uuid references recurring_rules(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on transactions (household_id, transaction_date desc);
create index on transactions (household_id, category_id);
create index on transactions (household_id, paid_by);
create index on transactions (import_batch_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- budgets
-- ─────────────────────────────────────────────
create table budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, category_id)
);

create index on budgets (household_id);

create trigger budgets_updated_at
  before update on budgets
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('budget_warning', 'budget_exceeded')),
  title        text not null,
  body         text not null,
  metadata     jsonb not null default '{}',
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index on notifications (user_id, is_read, created_at desc);
create index on notifications (household_id);

-- Prevent duplicate budget notifications for same category+type in same month
create unique index notifications_budget_dedup
  on notifications (household_id, type, (metadata->>'category_id'), (metadata->>'month'))
  where type in ('budget_warning', 'budget_exceeded');
