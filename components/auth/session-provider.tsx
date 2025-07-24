'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserWithRoles } from '@/schemas/auth';
import { trpc } from '@/util/trpc';

type SessionContextType = {
  data: UserWithRoles | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const SessionContext = createContext<SessionContextType>({
  data: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const value = {
    data: data || null,
    isLoading,
    isAuthenticated: !!data && !error,
    isAdmin: !!data?.roles?.includes('ADMIN'),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
