-- =====================================================
-- MUAINA PORTAL - COMPLETE RLS FIX (Idempotent)
-- =====================================================
-- Safe to run multiple times - drops everything first
-- =====================================================

-- STEP 1: Create helper functions (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$;

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
-- STEP 2: DROP ALL POLICIES (old and new names)
-- =====================================================

-- Organizations policies
DROP POLICY IF EXISTS "orgs_select_active" ON organizations;
DROP POLICY IF EXISTS "Anyone can view active organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Users policies (old names)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read org members" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Users policies (new names)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_org" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Reports policies (old names)
DROP POLICY IF EXISTS "Users can view org reports" ON reports;
DROP POLICY IF EXISTS "Users can create org reports" ON reports;
DROP POLICY IF EXISTS "Users can update org reports" ON reports;
DROP POLICY IF EXISTS "Admins can delete org reports" ON reports;
DROP POLICY IF EXISTS "Users can view reports from their organization" ON reports;
DROP POLICY IF EXISTS "Users can insert reports for their organization" ON reports;
DROP POLICY IF EXISTS "Users can update reports from their organization" ON reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;

-- Reports policies (new names)
DROP POLICY IF EXISTS "reports_select_org" ON reports;
DROP POLICY IF EXISTS "reports_insert_org" ON reports;
DROP POLICY IF EXISTS "reports_update_org" ON reports;
DROP POLICY IF EXISTS "reports_delete_admin" ON reports;

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE POLICIES
-- =====================================================

-- Organizations: Anyone authenticated can view active orgs
CREATE POLICY "orgs_select_active"
ON organizations FOR SELECT TO authenticated
USING (is_active = true);

-- Users: Read own profile (no recursion)
CREATE POLICY "users_select_own"
ON users FOR SELECT TO authenticated
USING (id = auth.uid());

-- Users: Read org members (uses helper function - no recursion)
CREATE POLICY "users_select_org"
ON users FOR SELECT TO authenticated
USING (organization_id = get_user_org_id());

-- Users: Insert own profile
CREATE POLICY "users_insert_own"
ON users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Users: Update own profile
CREATE POLICY "users_update_own"
ON users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Reports: View org reports
CREATE POLICY "reports_select_org"
ON reports FOR SELECT TO authenticated
USING (organization_id = get_user_org_id());

-- Reports: Create org reports
CREATE POLICY "reports_insert_org"
ON reports FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_org_id());

-- Reports: Update org reports
CREATE POLICY "reports_update_org"
ON reports FOR UPDATE TO authenticated
USING (organization_id = get_user_org_id());

-- Reports: Delete (admin/director only)
CREATE POLICY "reports_delete_admin"
ON reports FOR DELETE TO authenticated
USING (
  organization_id = get_user_org_id()
  AND get_user_role() IN ('admin', 'director')
);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'RLS Fix Complete!' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
