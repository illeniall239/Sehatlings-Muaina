'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive-100 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive-600" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900">Dashboard Error</h2>
        <p className="text-sm text-neutral-500">
          Something went wrong loading this page. Please try again.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
