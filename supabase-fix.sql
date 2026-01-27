-- STEP 1: First, let's drop all policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- STEP 2: Temporarily disable RLS to test
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- STEP 3: Check if the user exists (run this and check results)
-- SELECT * FROM users;

-- STEP 4: If you need to recreate the table, uncomment and run:
/*
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- Create organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'lab',
  settings JSONB DEFAULT '{"default_language": "en", "auto_translate": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY,  -- This should match auth.users.id
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'pathologist',
  profile JSONB DEFAULT '{}'::jsonb,
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  uploaded_by UUID REFERENCES users(id),
  original_file JSONB NOT NULL,
  extracted_content JSONB,
  ai_analysis JSONB DEFAULT '{"status": "pending"}'::jsonb,
  review JSONB DEFAULT '{"status": "pending"}'::jsonb,
  muaina_interpretation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test organization
INSERT INTO organizations (name, slug, type, is_active)
VALUES ('Muaina Diagnostic Lab', 'muaina-lab', 'lab', true)
ON CONFLICT (slug) DO NOTHING;
*/

-- STEP 5: After testing works, re-enable RLS with simple policies
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read all users (for testing)
-- CREATE POLICY "Allow authenticated read" ON users FOR SELECT TO authenticated USING (true);

-- Simple policy: authenticated users can update their own record
-- CREATE POLICY "Allow self update" ON users FOR UPDATE TO authenticated USING (id = auth.uid());

-- Simple policy: authenticated users can insert their own record
-- CREATE POLICY "Allow self insert" ON users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
