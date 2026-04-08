-- ─────────────────────────────────────────────
-- Helper: get the household_id for the current user
-- ─────────────────────────────────────────────
create or replace function get_my_household_id()
returns uuid language sql stable security definer as $$
  select household_id
  from household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ─────────────────────────────────────────────
-- households
-- ─────────────────────────────────────────────
alter table households enable row level security;

create policy "household members can view their household"
  on households for select
  using (id = get_my_household_id());

create policy "authenticated users can create a household"
  on households for insert
  with check (auth.uid() is not null);

create policy "household members can update their household"
  on households for update
  using (id = get_my_household_id());

-- ─────────────────────────────────────────────
-- household_members
-- ─────────────────────────────────────────────
alter table household_members enable row level security;

create policy "household members can view all members"
  on household_members for select
  using (household_id = get_my_household_id());

create policy "authenticated users can create their own member row"
  on household_members for insert
  with check (auth.uid() = user_id);

create policy "members can update their own row"
  on household_members for update
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- household_invites
-- ─────────────────────────────────────────────
alter table household_invites enable row level security;

create policy "household members can view invites"
  on household_invites for select
  using (household_id = get_my_household_id() or get_my_household_id() is null);

create policy "household members can create invites"
  on household_invites for insert
  with check (household_id = get_my_household_id());

create policy "anyone authenticated can use an invite"
  on household_invites for update
  using (auth.uid() is not null);

-- ─────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────
alter table categories enable row level security;

create policy "household members can view categories"
  on categories for select
  using (household_id = get_my_household_id());

create policy "household members can create categories"
  on categories for insert
  with check (household_id = get_my_household_id());

create policy "household members can update categories"
  on categories for update
  using (household_id = get_my_household_id());

create policy "household members can delete custom categories"
  on categories for delete
  using (household_id = get_my_household_id() and is_system = false);

-- ─────────────────────────────────────────────
-- import_batches
-- ─────────────────────────────────────────────
alter table import_batches enable row level security;

create policy "household members can view import batches"
  on import_batches for select
  using (household_id = get_my_household_id());

create policy "household members can create import batches"
  on import_batches for insert
  with check (household_id = get_my_household_id());

create policy "household members can delete import batches"
  on import_batches for delete
  using (household_id = get_my_household_id());

-- ─────────────────────────────────────────────
-- transactions
-- ─────────────────────────────────────────────
alter table transactions enable row level security;

create policy "household members can view transactions"
  on transactions for select
  using (household_id = get_my_household_id());

create policy "household members can create transactions"
  on transactions for insert
  with check (household_id = get_my_household_id());

create policy "household members can update transactions"
  on transactions for update
  using (household_id = get_my_household_id());

create policy "household members can delete transactions"
  on transactions for delete
  using (household_id = get_my_household_id());

-- ─────────────────────────────────────────────
-- recurring_rules
-- ─────────────────────────────────────────────
alter table recurring_rules enable row level security;

create policy "household members can view recurring rules"
  on recurring_rules for select
  using (household_id = get_my_household_id());

create policy "household members can create recurring rules"
  on recurring_rules for insert
  with check (household_id = get_my_household_id());

create policy "household members can update recurring rules"
  on recurring_rules for update
  using (household_id = get_my_household_id());

create policy "household members can delete recurring rules"
  on recurring_rules for delete
  using (household_id = get_my_household_id());

-- ─────────────────────────────────────────────
-- budgets
-- ─────────────────────────────────────────────
alter table budgets enable row level security;

create policy "household members can view budgets"
  on budgets for select
  using (household_id = get_my_household_id());

create policy "household members can create budgets"
  on budgets for insert
  with check (household_id = get_my_household_id());

create policy "household members can update budgets"
  on budgets for update
  using (household_id = get_my_household_id());

create policy "household members can delete budgets"
  on budgets for delete
  using (household_id = get_my_household_id());

-- ─────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────
alter table notifications enable row level security;

create policy "users can view their own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "household members can create notifications"
  on notifications for insert
  with check (household_id = get_my_household_id());

create policy "users can update their own notifications"
  on notifications for update
  using (user_id = auth.uid());

create policy "users can delete their own notifications"
  on notifications for delete
  using (user_id = auth.uid());
