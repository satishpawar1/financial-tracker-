-- Add structured utility tracking fields to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS utility_type TEXT,
  ADD COLUMN IF NOT EXISTS utility_provider TEXT;

COMMENT ON COLUMN transactions.utility_type IS 'Type of utility: Electric, Water, Gas, Internet, Phone, Cable/TV, Sewer, Trash, Other';
COMMENT ON COLUMN transactions.utility_provider IS 'Utility provider / company name (e.g. PG&E, Comcast)';
