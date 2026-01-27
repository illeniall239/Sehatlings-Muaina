-- =====================================================
-- DOCTORS TABLE - Global (shared across all organizations)
-- =====================================================
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if exists (for clean setup)
DROP TABLE IF EXISTS doctors;

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  qualification VARCHAR(500) NOT NULL,
  years_of_practice INTEGER,
  appointment_location VARCHAR(500),
  is_available_online BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_active ON doctors(is_active) WHERE is_active = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- Doctors are global - all authenticated users can view
-- Only admins/directors can manage
-- =====================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view doctors
CREATE POLICY "doctors_select_all"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/directors can insert doctors
CREATE POLICY "doctors_insert_admin"
  ON doctors FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'director'));

-- Only admins/directors can update doctors
CREATE POLICY "doctors_update_admin"
  ON doctors FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'director'));

-- Only admins/directors can delete doctors
CREATE POLICY "doctors_delete_admin"
  ON doctors FOR DELETE
  TO authenticated
  USING (get_user_role() IN ('admin', 'director'));

-- =====================================================
-- TRIGGER for updated_at
-- =====================================================

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'doctors table created successfully (GLOBAL - no organization_id)' AS status
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'doctors');
