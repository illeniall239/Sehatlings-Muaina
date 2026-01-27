"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Activity,
  HelpCircle,
  Settings,
  BarChart3,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
  },
  {
    name: "Upload",
    href: "/dashboard/reports/upload",
    icon: Upload,
  },
  {
    name: "Usage & Costs",
    href: "/dashboard/usage",
    icon: BarChart3,
    adminOnly: true,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  // Filter navigation items based on user role
  const isAdmin = profile?.role === "admin" || profile?.role === "director";
  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-100 bg-white/95 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex h-20 items-center px-6">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo Mark */}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 shadow-lg shadow-primary-800/20 group-hover:shadow-xl group-hover:shadow-primary-800/25 transition-all duration-300">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-neutral-900 tracking-tight">
                Muaina
              </span>
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.15em]">
                Diagnostics
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Main Menu
          </p>
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              // Check for exact match, or prefix match only if no more specific route matches
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href) &&
                  !filteredNavigation.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.startsWith(item.href) &&
                      pathname.startsWith(other.href)
                  ));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary-800 text-white shadow-md shadow-primary-800/20"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-white/20"
                        : "bg-neutral-100 group-hover:bg-neutral-200/80"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive ? "text-white" : "text-neutral-500 group-hover:text-neutral-700"
                      )}
                      strokeWidth={2}
                    />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 pb-6">
          {/* Help Link */}
          <Link
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Need help?</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
