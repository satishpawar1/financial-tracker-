-- Enable realtime for transactions and budgets
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table notifications;
