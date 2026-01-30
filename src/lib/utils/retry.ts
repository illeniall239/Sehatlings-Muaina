/**
 * Retry utility with exponential backoff
 * Used for resilient data fetching in auth and API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Wraps an async function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100, onRetry } = options || {};
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      if (attempt < maxAttempts - 1) {
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wraps an async function with retry logic, returning null on failure instead of throwing
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns The result of the function if successful, or null if all retries fail
 */
export async function withRetryOrNull<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T | null> {
  try {
    return await withRetry(fn, options);
  } catch {
    return null;
  }
}
