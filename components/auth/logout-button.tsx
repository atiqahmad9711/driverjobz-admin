'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trpc } from '@/util/trpc';

export function LogoutButton() {
  const router = useRouter();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push('/login');
      router.refresh();
    },
  });

  return (
    <Button
      variant="ghost"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
    >
      {logout.isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
