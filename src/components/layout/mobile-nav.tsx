"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandMark } from "./brand-mark";
import { SidebarNav } from "./sidebar-nav";
import { siteConfig } from "@/config/site";

/**
 * Mobile drawer navigation — replaces the desktop sidebar below lg.
 *
 * The stateful drawer is keyed by pathname: navigating remounts it closed.
 * Relying on the exit animation instead can leave a cancelled, invisible
 * popup behind that blocks taps (the route transition cancels the CSS
 * transition Base UI waits on).
 */
export function MobileNav() {
  const pathname = usePathname();
  return <MobileNavDrawer key={pathname} />;
}

function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2.5 text-sm">
            <BrandMark size={28} />
            {siteConfig.name}
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
