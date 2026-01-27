/**
 * Seed Script for Doctors (GLOBAL)
 *
 * Seeds the initial 11 doctors for Muaina.
 * Doctors are GLOBAL - shared across all organizations.
 *
 * Usage:
 *   npx ts-node scripts/seed-doctors.ts
 *
 * Note: No organization_id needed - doctors are available to all labs/clinics.
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

// Doctor type for this script
interface Doctor {
  name: string;
  specialty: string;
  qualification: string;
  years_of_practice: number | null;
  appointment_location: string | null;
  is_available_online: boolean;
  is_active: boolean;
}

// Doctor data to seed (GLOBAL - no organization_id)
const doctors: Doctor[] = [
  {
    name: 'Dr. Ashraf Memon',
    specialty: 'Pathology',
    qualification: 'MCPS Pathology, MSc Infection Disease (UK)',
    years_of_practice: 40,
    appointment_location: 'Kharadar Lab',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Agha Umer Draz',
    specialty: 'Pathology',
    qualification: 'MCPS Pathology',
    years_of_practice: 40,
    appointment_location: 'Ibn e Sena',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Prof Dr. Tanveer Alam',
    specialty: 'Physician',
    qualification: 'FCPS Physician',
    years_of_practice: 30,
    appointment_location: 'DUHS',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Iqbal Khan',
    specialty: 'Chest Specialist',
    qualification: 'Chest Specialist',
    years_of_practice: 20,
    appointment_location: 'Civil Hospital Nawabshah',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Farkhana Iqbal',
    specialty: 'Gynae & Obs',
    qualification: 'FCPS Gynae & Obs',
    years_of_practice: 20,
    appointment_location: 'People Medical College Nawabshah',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Seema Umer',
    specialty: 'Sinologist',
    qualification: 'MBBS Sinologist',
    years_of_practice: 25,
    appointment_location: null,
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Talat Mehmood',
    specialty: 'General & Pediatric Surgery',
    qualification: 'FCPS General & Pediatric Surgeon',
    years_of_practice: 30,
    appointment_location: null,
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Shabbir Malik',
    specialty: 'Pediatrics',
    qualification: 'MRCP Peds (UK)',
    years_of_practice: 35,
    appointment_location: 'Liaquat National Hospital',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Muhammad Irfan',
    specialty: 'Haematology',
    qualification: 'FCPS Haematology',
    years_of_practice: 40,
    appointment_location: 'Liaquat National Hospital',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Danish Shakeel',
    specialty: 'Haematology',
    qualification: 'FCPS Haematology',
    years_of_practice: 10,
    appointment_location: 'Aga Khan Hospital',
    is_available_online: true,
    is_active: true,
  },
  {
    name: 'Dr. Muhammad Hammad Khan',
    specialty: 'Radiation Oncology',
    qualification: 'FCPS Radiation Oncology',
    years_of_practice: 10,
    appointment_location: 'Ziauddin Medical University & Hospital',
    is_available_online: true,
    is_active: true,
  },
];

async function seedDoctors() {
  console.log('\nSeeding GLOBAL doctors for Muaina...\n');

  // Check if doctors already exist
  const { data: existingDoctors, error: existingError } = await supabase
    .from('doctors')
    .select('id, name');

  if (existingError) {
    console.error('Error checking existing doctors:', existingError.message);
    process.exit(1);
  }

  const existing = existingDoctors as { id: string; name: string }[] | null;

  if (existing && existing.length > 0) {
    console.log(`Warning: ${existing.length} doctors already exist in the database`);
    console.log('Existing doctors:');
    existing.forEach((d) => console.log(`   - ${d.name}`));
    console.log('\nSkipping seed to avoid duplicates. Delete existing doctors first if you want to re-seed.\n');
    process.exit(0);
  }

  // Insert doctors
  const { data: insertedDoctors, error: insertError } = await supabase
    .from('doctors')
    .insert(doctors)
    .select();

  if (insertError) {
    console.error('Error inserting doctors:', insertError.message);
    process.exit(1);
  }

  const inserted = insertedDoctors as { id: string; name: string; specialty: string }[] | null;

  console.log(`Successfully seeded ${inserted?.length || 0} GLOBAL doctors:\n`);
  inserted?.forEach((d) => {
    console.log(`   + ${d.name} (${d.specialty})`);
  });

  console.log('\nThese doctors are now available to ALL organizations in Muaina.');
  console.log('Seed completed successfully!\n');
}

seedDoctors().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
