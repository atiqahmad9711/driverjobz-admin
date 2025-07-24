'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        className: 'bg-background text-foreground',
        style: {
          maxWidth: '100%',
        },
      }}
    />
  );
}
