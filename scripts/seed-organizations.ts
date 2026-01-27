/**
 * Seed Script for Organizations (Karachi Labs)
 *
 * Seeds the major diagnostic lab chains in Karachi.
 * Organizations are the top-level entities for multi-tenancy.
 *
 * Usage:
 *   npx ts-node scripts/seed-organizations.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Organization type for this script
interface Organization {
  id?: string;
  name: string;
  slug: string;
  type: 'lab' | 'hospital' | 'clinic';
  settings: {
    default_language: 'en' | 'ur';
    auto_translate: boolean;
  };
  is_active: boolean;
}

// Karachi diagnostic labs to seed
const organizations: Organization[] = [
  {
    name: 'Aga Khan University Hospital Laboratory',
    slug: 'aga-khan-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Chughtai Lab',
    slug: 'chughtai-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Dr. Essa Laboratory & Diagnostic Centre',
    slug: 'essa-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Islamabad Diagnostic Centre (IDC)',
    slug: 'idc-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Citi Lab & Research Centre',
    slug: 'citi-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Excel Labs',
    slug: 'excel-labs',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
  {
    name: 'Husaini Blood Bank & Laboratory',
    slug: 'husaini-lab',
    type: 'lab',
    settings: {
      default_language: 'en',
      auto_translate: false,
    },
    is_active: true,
  },
];

async function seedOrganizations() {
  console.log('\nSeeding Karachi diagnostic labs as organizations...\n');

  // Check if organizations already exist
  const { data: existingOrgs, error: existingError } = await supabase
    .from('organizations')
    .select('id, name, slug');

  if (existingError) {
    console.error('Error checking existing organizations:', existingError.message);
    process.exit(1);
  }

  const existing = existingOrgs as { id: string; name: string; slug: string }[] | null;
  const existingSlugs = new Set(existing?.map(o => o.slug) || []);

  // Filter out organizations that already exist
  const newOrganizations = organizations.filter(org => !existingSlugs.has(org.slug));

  if (newOrganizations.length === 0) {
    console.log('All organizations already exist in the database:');
    existing?.forEach((org) => console.log(`   - ${org.name} (${org.slug})`));
    console.log('\nNothing to add.\n');
    process.exit(0);
  }

  if (existing && existing.length > 0) {
    console.log(`Found ${existing.length} existing organizations.`);
    console.log(`Adding ${newOrganizations.length} new organizations...\n`);
  }

  // Insert new organizations
  const { data: insertedOrgs, error: insertError } = await supabase
    .from('organizations')
    .insert(newOrganizations)
    .select();

  if (insertError) {
    console.error('Error inserting organizations:', insertError.message);
    process.exit(1);
  }

  const inserted = insertedOrgs as { id: string; name: string; slug: string }[] | null;

  console.log(`Successfully seeded ${inserted?.length || 0} organizations:\n`);
  inserted?.forEach((org) => {
    console.log(`   + ${org.name}`);
    console.log(`     Slug: ${org.slug}`);
    console.log(`     ID: ${org.id}`);
    console.log('');
  });

  console.log('These labs will now appear in the signup dropdown.');
  console.log('Seed completed successfully!\n');
}

seedOrganizations().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
