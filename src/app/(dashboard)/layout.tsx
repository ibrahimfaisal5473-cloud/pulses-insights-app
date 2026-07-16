import type { ReactNode } from "react";
import { verifySession } from "@/lib/auth/dal";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

/**
 * App shell for the protected dashboard route group:
 * desktop sidebar + top header + scrollable main content area.
 *
 * verifySession() is the authoritative auth check (proxy.ts only does the
 * optimistic redirect) and provides the username to the shell.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { username } = await verifySession();

  return (
    <div className="flex min-h-screen">
      <Sidebar username={username} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header username={username} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
