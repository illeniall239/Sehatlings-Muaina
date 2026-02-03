'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface InsuranceAuthGuardProps {
  children: React.ReactNode;
}

export function InsuranceAuthGuard({ children }: InsuranceAuthGuardProps) {
  const { isAuthenticated, loading, error, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (profile?.role !== 'insurance') {
        // Redirect non-insurance users to regular dashboard
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, loading, profile, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/50">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="h-12 w-12 rounded-full bg-destructive-100 flex items-center justify-center">
            <span className="text-destructive-600 text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Authentication Error</h2>
          <p className="text-sm text-neutral-500">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or wrong role
  if (!isAuthenticated || profile?.role !== 'insurance') {
    return null;
  }

  return <>{children}</>;
}
