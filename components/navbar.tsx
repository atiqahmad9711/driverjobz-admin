"use client";

import Link from "next/link";
import { useSession } from "@/components/auth/session-provider";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Navbar() {
  const { data: session, isLoading } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">DriverJobz Admin</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {session?.userId && (
              <Link
                href="/form-fields"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Form Fields
              </Link>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : session?.userId ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {session?.firstName || session?.email}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
