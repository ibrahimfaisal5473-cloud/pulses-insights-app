"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Frown,
  Layers,
  LayoutDashboard,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import { dashboardNav } from "@/config/nav";
import { cn } from "@/lib/utils";

/** Resolves the icon names stored in the nav config to Lucide components. */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Layers,
  Route,
  Frown,
};

/**
 * Vertical nav list with active-route highlighting.
 * Used by both the desktop sidebar and the mobile drawer.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard sections" className="flex flex-col gap-1">
      {dashboardNav.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-teal-600/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
