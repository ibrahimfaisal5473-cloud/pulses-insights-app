import { verifySession } from "@/lib/auth/dal";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function OverviewPage() {
  // Authoritative session check (defense-in-depth beyond proxy.ts).
  const { username } = await verifySession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">Pulses Insights</h1>
      <p className="text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{username}</span>.
      </p>
      <p className="text-sm text-muted-foreground">
        Foundation ready — the Overview dashboard is built in a later milestone.
      </p>
      <LogoutButton />
    </main>
  );
}
