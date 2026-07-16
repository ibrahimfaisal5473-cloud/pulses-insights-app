import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

/**
 * Desktop sidebar — fixed column with brand, section nav, and the signed-in
 * user + sign-out at the bottom. Hidden below lg (the header's drawer takes
 * over on mobile).
 */
export function Sidebar({ username }: { username: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandMark size={32} />
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNav />
      </div>

      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{username}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
