-- =====================================================
-- MUAINA PORTAL - PRODUCTION-READY DATABASE SETUP
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: DROP EXISTING POLICIES (Clean slate)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated read" ON users;
DROP POLICY IF EXISTS "Allow self update" ON users;
DROP POLICY IF EXISTS "Allow self insert" ON users;

DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Anyone can view active organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view reports from their organization" ON reports;
DROP POLICY IF EXISTS "Users can insert reports for their organization" ON reports;
DROP POLICY IF EXISTS "Users can update reports from their organization" ON reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- =====================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: ORGANIZATIONS POLICIES
-- =====================================================

-- Anyone authenticated can view active organizations (needed for signup dropdown)
CREATE POLICY "Anyone can view active organizations" ON organizations
  FOR SELECT TO authenticated
  USING (is_active = true);

-- =====================================================
-- STEP 4: USERS POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can read other users in same organization (for collaboration)
CREATE POLICY "Users can read org members" ON users
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can insert their own profile (signup)
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 5: REPORTS POLICIES
-- =====================================================

-- Users can view reports from their organization
CREATE POLICY "Users can view org reports" ON reports
  FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can create reports for their organization
CREATE POLICY "Users can create org reports" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can update reports from their organization
CREATE POLICY "Users can update org reports" ON reports
  FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Only admins/directors can delete reports
CREATE POLICY "Admins can delete org reports" ON reports
  FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'director')
  );

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_org_id ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_uploaded_by ON reports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- =====================================================
-- STEP 7: AUTO-UPDATE TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VERIFICATION: Check policies are created
-- =====================================================
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
