'use client';

import { SessionProvider } from '@/components/auth/session-provider';


export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
