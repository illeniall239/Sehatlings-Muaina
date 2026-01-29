'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50/50 p-4">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive-100 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive-600" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900">Something went wrong</h2>
        <p className="text-sm text-neutral-500">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
