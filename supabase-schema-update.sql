-- =====================================================
-- SCHEMA UPDATE: Add branch field to users table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This allows users to specify which branch they work at

-- Add branch column to users table (optional field)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS branch VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.branch IS 'Optional: The specific branch/location where the user works (e.g., DHA Phase 5, Gulshan-e-Iqbal)';

-- Verification
SELECT 'Branch column added to users table' AS status
WHERE EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'branch'
);
