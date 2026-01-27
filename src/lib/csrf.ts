import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF Protection for API routes
 *
 * Validates that state-changing requests (POST, PATCH, DELETE, PUT)
 * originate from our own domain by checking Origin/Referer headers.
 *
 * This is effective for SPAs where:
 * - All API calls are made via JavaScript (fetch/axios)
 * - Browsers automatically include Origin header for cross-origin requests
 * - Same-origin requests include Referer header
 */

// Get allowed origins from environment or use defaults
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add production URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Add Vercel preview URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

/**
 * Validates the request origin for CSRF protection
 * Returns null if valid, or a NextResponse error if invalid
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Only check state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins = getAllowedOrigins();

  // For same-origin requests, Origin might not be set but Referer will be
  // For cross-origin requests, Origin will be set

  // Check Origin header first (most reliable for CORS requests)
  if (origin) {
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      return null; // Valid origin
    }
    console.warn('CSRF: Invalid origin', { origin, allowedOrigins });
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  // Fall back to Referer header for same-origin requests
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (allowedOrigins.some(allowed => refererOrigin === allowed || refererOrigin.startsWith(allowed))) {
        return null; // Valid referer
      }
    } catch {
      // Invalid referer URL
    }
    console.warn('CSRF: Invalid referer', { referer, allowedOrigins });
    return NextResponse.json(
      { error: 'Invalid request origin' },
      { status: 403 }
    );
  }

  // No origin or referer - could be:
  // 1. Direct API call (curl, Postman) - should be blocked in production
  // 2. Same-origin request with privacy settings blocking referer
  //
  // For now, allow in development, block in production
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  console.warn('CSRF: Missing origin and referer headers');
  return NextResponse.json(
    { error: 'Missing origin header' },
    { status: 403 }
  );
}

/**
 * Helper to wrap API handlers with CSRF protection
 */
export function withCsrfProtection<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }
    return handler(request, ...args);
  };
}
