'use client';

import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';
import type { AuthContextValue, UserProfile } from '@/contexts/auth-context';

export type { UserProfile };

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
