/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js during server startup.
 * Use it to initialize monitoring, validate configuration, etc.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables at startup
    const { assertValidEnv } = await import('@/lib/env');
    
    console.log('\n🚀 Starting Muaina Portal...\n');
    
    try {
      assertValidEnv();
    } catch (error) {
      // In production, this will prevent startup
      // In development, it will just log warnings
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Startup failed due to configuration errors');
        throw error;
      }
    }
    
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log('');
  }
}
