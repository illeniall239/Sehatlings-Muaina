'use client';

import { createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';

const SupabaseContext = createContext<ReturnType<typeof createClient> | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
};
