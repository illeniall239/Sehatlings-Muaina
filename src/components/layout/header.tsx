"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Bell,
} from "lucide-react";

export function Header() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info
  const userName = profile?.profile?.first_name
    ? `${profile.profile.first_name} ${profile.profile.last_name || ""}`.trim()
    : "User";
  const userEmail = profile?.email || "";
  const userRole = profile?.role || "pathologist";
  const organizationName = profile?.organization?.name || "Organization";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl px-6 lg:px-8">

      {/* Right side - Organization, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Organization Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg border border-primary-100">
          <Building2 className="h-4 w-4 text-primary-700" />
          <span className="text-sm font-medium text-primary-800 max-w-[150px] truncate">
            {organizationName}
          </span>
        </div>

        {/* Notifications (placeholder) */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-neutral-500" />
          {/* Notification dot */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive-500 rounded-full" /> */}
        </Button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center text-white text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-neutral-800 leading-tight">
                {userName}
              </p>
              <p className="text-xs text-neutral-500 capitalize">{userRole}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-neutral-200 shadow-lg py-2 animate-fade-in">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="text-sm font-semibold text-neutral-900">{userName}</p>
                <p className="text-xs text-neutral-500 truncate">{userEmail}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-xs text-neutral-600 truncate">{organizationName}</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <User className="h-4 w-4 text-neutral-500" />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-neutral-500" />
                  Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-neutral-100 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive-600 hover:bg-destructive-50 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
