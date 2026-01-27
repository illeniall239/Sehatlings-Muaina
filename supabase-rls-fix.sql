-- =====================================================
-- MUAINA PORTAL - RLS FIX (Run this to fix recursion)
-- =====================================================
-- The issue: Policies on 'users' table were querying 
-- the 'users' table, causing infinite recursion.
-- 
-- Solution: Use a security-definer function that 
-- bypasses RLS to get the user's organization_id.
-- =====================================================

-- STEP 1: Create helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$;

-- STEP 2: Create helper function for role check
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- =====================================================
-- STEP 3: DROP ALL EXISTING POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read org members" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

DROP POLICY IF EXISTS "Anyone can view active organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

DROP POLICY IF EXISTS "Users can view org reports" ON reports;
DROP POLICY IF EXISTS "Users can create org reports" ON reports;
DROP POLICY IF EXISTS "Users can update org reports" ON reports;
DROP POLICY IF EXISTS "Admins can delete org reports" ON reports;
DROP POLICY IF EXISTS "Users can view reports from their organization" ON reports;
DROP POLICY IF EXISTS "Users can insert reports for their organization" ON reports;
DROP POLICY IF EXISTS "Users can update reports from their organization" ON reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: ORGANIZATIONS POLICIES
-- =====================================================
CREATE POLICY "orgs_select_active"
ON organizations FOR SELECT TO authenticated
USING (is_active = true);

-- =====================================================
-- STEP 6: USERS POLICIES (Fixed - no recursion)
-- =====================================================

-- Users can always read their OWN profile (simple check, no recursion)
CREATE POLICY "users_select_own"
ON users FOR SELECT TO authenticated
USING (id = auth.uid());

-- Users can read other users in same org (uses helper function)
CREATE POLICY "users_select_org"
ON users FOR SELECT TO authenticated
USING (organization_id = get_user_org_id());

-- Users can insert their own profile during signup
CREATE POLICY "users_insert_own"
ON users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own"
ON users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 7: REPORTS POLICIES (uses helper function)
-- =====================================================

-- Users can view reports from their organization
CREATE POLICY "reports_select_org"
ON reports FOR SELECT TO authenticated
USING (organization_id = get_user_org_id());

-- Users can create reports for their organization
CREATE POLICY "reports_insert_org"
ON reports FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_org_id());

-- Users can update reports from their organization
CREATE POLICY "reports_update_org"
ON reports FOR UPDATE TO authenticated
USING (organization_id = get_user_org_id());

-- Only admins/directors can delete reports
CREATE POLICY "reports_delete_admin"
ON reports FOR DELETE TO authenticated
USING (
  organization_id = get_user_org_id()
  AND get_user_role() IN ('admin', 'director')
);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'Policies created:' as status;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
