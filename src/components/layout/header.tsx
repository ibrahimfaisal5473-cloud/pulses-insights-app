import { BrandMark } from "./brand-mark";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { LogoutButton } from "./logout-button";
import { siteConfig } from "@/config/site";

/**
 * Top bar of the app shell. On mobile it also carries the brand and the
 * drawer trigger (the desktop sidebar is hidden below lg).
 */
export function Header({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <div className="flex items-center gap-2.5 lg:hidden">
        <BrandMark size={26} />
        <span className="font-heading text-[15px] font-semibold tracking-[-0.02em]">
          {siteConfig.name}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-[13px] font-medium text-muted-foreground sm:inline">
          {username}
        </span>
        <ThemeToggle />
        <span className="lg:hidden">
          <LogoutButton />
        </span>
      </div>
    </header>
  );
}
