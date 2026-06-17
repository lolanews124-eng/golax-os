"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Radar, LogOut, User } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Radar className="h-5 w-5 text-primary" />
            Golax Prospect AI OS
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name}</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
