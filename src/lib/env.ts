/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are present
 * and provides type-safe access to them.
 * 
 * IMPORTANT: Import this module early in your application (e.g., in instrumentation.ts)
 * to catch missing env vars at startup rather than runtime.
 */

interface EnvConfig {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Anthropic AI
  ANTHROPIC_API_KEY?: string;
  
  // Upstash Redis (optional for dev)
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  
  // Node environment
  NODE_ENV: 'development' | 'production' | 'test';
}

interface EnvVariable {
  name: keyof EnvConfig;
  required: boolean;
  requiredInProd: boolean;
  description: string;
}

const ENV_VARIABLES: EnvVariable[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    requiredInProd: true,
    description: 'Supabase project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    requiredInProd: true,
    description: 'Supabase anonymous/public key',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    requiredInProd: true,
    description: 'Supabase service role key (admin access)',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    requiredInProd: true,
    description: 'Anthropic/Claude API key for AI analysis',
  },
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: false,
    requiredInProd: true,
    description: 'Upstash Redis REST URL for caching',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: false,
    requiredInProd: true,
    description: 'Upstash Redis REST token',
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name];
    const isEmpty = !value || value.trim() === '';

    if (isEmpty) {
      if (envVar.required) {
        errors.push(`Missing required env var: ${envVar.name} - ${envVar.description}`);
      } else if (envVar.requiredInProd && isProduction) {
        errors.push(`Missing required (production) env var: ${envVar.name} - ${envVar.description}`);
      } else if (envVar.requiredInProd) {
        warnings.push(`Missing env var (recommended): ${envVar.name} - ${envVar.description}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment variables and throw if invalid
 * Call this at application startup
 */
export function assertValidEnv(): void {
  const result = validateEnv();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Variable Warnings:');
    result.warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn('');
  }

  // Throw on errors
  if (!result.valid) {
    console.error('\n❌ Environment Variable Errors:');
    result.errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\nPlease check your .env.local file.\n');
    
    // In production, throw to prevent startup with missing vars
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables:\n${result.errors.join('\n')}`
      );
    }
  } else {
    console.log('✅ Environment variables validated successfully');
  }
}

/**
 * Type-safe environment variable getter
 */
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] | undefined {
  return process.env[key] as EnvConfig[K] | undefined;
}

/**
 * Get required environment variable or throw
 */
export function requireEnv<K extends keyof EnvConfig>(key: K): NonNullable<EnvConfig[K]> {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value as NonNullable<EnvConfig[K]>;
}
