import { Loader2 } from 'lucide-react';

export default function ReportsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-800" />
        </div>
        <p className="text-neutral-500 text-sm">Loading reports...</p>
      </div>
    </div>
  );
}
