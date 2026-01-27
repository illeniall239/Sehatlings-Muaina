import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  try {
    console.log("Seeding Supabase database...\n");

    // Create test organization
    console.log("1. Creating test organization...");

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'muaina-lab')
      .single();

    let org;
    if (!existingOrg) {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: "Muaina Diagnostic Lab",
          slug: "muaina-lab",
          type: "lab",
          settings: {
            default_language: "en",
            auto_translate: true,
          },
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating organization:', error);
        throw error;
      }

      org = data;
      console.log("   ✓ Organization created:", org.name);
    } else {
      console.log("   ✓ Organization already exists:", existingOrg.name);
      org = existingOrg;
    }

    // Create test user
    console.log("\n2. Creating test user...");

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'doctor@muaina.com')
      .single();

    if (!existingUser) {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'doctor@muaina.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          first_name: 'Dr. Ahmed',
          last_name: 'Khan',
        },
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'doctor@muaina.com',
          role: 'pathologist',
          profile: {
            first_name: 'Dr. Ahmed',
            last_name: 'Khan',
            title: 'Dr.',
            specialization: 'Hematology',
          },
          organization_id: org.id,
          is_active: true,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Clean up auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      console.log("   ✓ User created: doctor@muaina.com");
    } else {
      console.log("   ✓ User already exists:", existingUser.email);
    }

    // Create a second test user (technician)
    console.log("\n3. Creating technician user...");

    const { data: existingTech } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'tech@muaina.com')
      .single();

    if (!existingTech) {
      const { data: techAuthData, error: techAuthError } = await supabase.auth.admin.createUser({
        email: 'tech@muaina.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          first_name: 'Sarah',
          last_name: 'Johnson',
        },
      });

      if (techAuthError) {
        console.error('Error creating technician auth user:', techAuthError);
        throw techAuthError;
      }

      const { error: techProfileError } = await supabase
        .from('users')
        .insert({
          id: techAuthData.user.id,
          email: 'tech@muaina.com',
          role: 'technician',
          profile: {
            first_name: 'Sarah',
            last_name: 'Johnson',
            title: '',
            specialization: 'Lab Technician',
          },
          organization_id: org.id,
          is_active: true,
        });

      if (techProfileError) {
        console.error('Error creating technician profile:', techProfileError);
        await supabase.auth.admin.deleteUser(techAuthData.user.id);
        throw techProfileError;
      }

      console.log("   ✓ Technician created: tech@muaina.com");
    } else {
      console.log("   ✓ Technician already exists:", existingTech.email);
    }

    console.log("\n========================================");
    console.log("✓ Seed completed successfully!");
    console.log("========================================");
    console.log("\nTest credentials:");
    console.log("----------------------------------------");
    console.log("Pathologist:");
    console.log("  Email:    doctor@muaina.com");
    console.log("  Password: password123");
    console.log("\nTechnician:");
    console.log("  Email:    tech@muaina.com");
    console.log("  Password: password123");
    console.log("========================================\n");

  } catch (error) {
    console.error("\n✗ Seed failed:", error);
    process.exit(1);
  }
}

seed();
