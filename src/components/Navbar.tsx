"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Activity, ArrowRight, Search, Bell } from "lucide-react";

export default function Navbar() {
  const { profile, loading, signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/50 bg-white/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-800 to-primary-700 shadow-md shadow-primary-800/15 group-hover:shadow-lg group-hover:shadow-primary-800/20 transition-all duration-300">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-neutral-900 tracking-tight">
            Muaina
          </span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          ) : isAuthenticated ? (
            <>
              {/* Search Input */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-56 rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-lg relative text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-800 ring-2 ring-white" />
              </Button>

              {/* User Name */}
              <span className="text-sm font-medium text-neutral-700 hidden sm:inline">
                {profile?.profile?.first_name} {profile?.profile?.last_name}
              </span>

              <Button onClick={handleSignOut} variant="ghost" size="sm">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
