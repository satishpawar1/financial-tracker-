-- This function seeds default categories for a new household.
-- Called after household creation from the app.
create or replace function seed_default_categories(p_household_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into categories (household_id, name, color, icon, is_system) values
    (p_household_id, 'Housing',       '#6366f1', 'home',          true),
    (p_household_id, 'Groceries',     '#22c55e', 'shopping-cart', true),
    (p_household_id, 'Dining Out',    '#f97316', 'utensils',      true),
    (p_household_id, 'Transport',     '#3b82f6', 'car',           true),
    (p_household_id, 'Utilities',     '#eab308', 'zap',           true),
    (p_household_id, 'Healthcare',    '#ef4444', 'heart-pulse',   true),
    (p_household_id, 'Entertainment', '#a855f7', 'tv',            true),
    (p_household_id, 'Shopping',      '#ec4899', 'bag',           true),
    (p_household_id, 'Education',     '#14b8a6', 'book-open',     true),
    (p_household_id, 'Travel',        '#f59e0b', 'plane',         true),
    (p_household_id, 'Insurance',     '#64748b', 'shield',        true),
    (p_household_id, 'Subscriptions', '#8b5cf6', 'repeat',        true),
    (p_household_id, 'Personal Care', '#f43f5e', 'sparkles',      true),
    (p_household_id, 'Salary',        '#10b981', 'briefcase',     true),
    (p_household_id, 'Other',         '#94a3b8', 'more-horizontal',true);
end;
$$;
