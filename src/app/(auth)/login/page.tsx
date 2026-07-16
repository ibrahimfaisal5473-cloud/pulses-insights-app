"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  LifeBuoy,
  Lock,
  Route,
  ShieldCheck,
  Smile,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark } from "@/components/layout/brand-mark";

const BRAND = "#0F766E";
const BRAND_HOVER = "#115E56";

const FEATURES = [
  { icon: Activity, label: "Live occupancy & footfall" },
  { icon: Route, label: "Zone-to-zone journey analytics" },
  { icon: Smile, label: "Real-time visitor sentiment" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to sign in");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
        {/* ---------- Left: brand panel ---------- */}
        <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col xl:p-16">
          {/* layered background pattern (pulse rings + dot grid + glow) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(125% 125% at 12% 8%, #12514A 0%, #0C3A35 46%, #06231F 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 22% 26%, rgba(255,255,255,0.055) 0px, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 44px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
            style={{ background: "rgba(20,184,166,0.28)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full blur-3xl"
            style={{ background: "rgba(13,148,136,0.20)" }}
          />

          {/* content */}
          <div className="relative flex items-center gap-3">
            <BrandMark size={40} />
            <span className="text-lg font-semibold tracking-tight">
              Pulses Insights
            </span>
          </div>

          <div className="relative mt-auto max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              Visitor Intelligence Platform
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight">
              Intelligence for every visit.
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/70">
              Real-time visitor flow, occupancy, and sentiment across all your
              spaces — unified in one secure enterprise dashboard.
            </p>

            <ul className="mt-9 flex flex-col gap-3.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <Icon className="h-4 w-4 text-teal-300" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-auto pt-12 text-xs text-white/45">
            Secure enterprise access · SOC-style activity logging
          </div>
        </section>

        {/* ---------- Right: login form ---------- */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            {/* mobile brand (left panel hidden on small screens) */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark size={40} />
              <span className="text-lg font-semibold tracking-tight">
                Pulses Insights
              </span>
            </div>

            <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to access real-time facility analytics for your spaces.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">Email or username</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="username"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="px-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="remember" />
                  Remember me for 30 days
                </label>
                <a
                  href="#"
                  className="text-sm font-medium hover:underline"
                  style={{ color: BRAND }}
                >
                  Need help?
                </a>
              </div>

              {error && (
                <p
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full text-white"
                style={{ backgroundColor: loading ? BRAND_HOVER : BRAND }}
              >
                {loading ? (
                  "Signing in…"
                ) : (
                  <>
                    Sign in to dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Demo access — <code className="font-medium">admin</code> /{" "}
                <code className="font-medium">password123</code>
              </p>
            </form>

            {/* security / info card */}
            <div className="mt-8 flex gap-3 rounded-xl border bg-muted/40 p-4">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: BRAND }}
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Enterprise security
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Access is restricted to authorized personnel. Sessions are
                  encrypted and all activity is logged for security and
                  compliance.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <a href="#" className="inline-flex items-center gap-1.5 hover:text-foreground">
                <LifeBuoy className="h-3.5 w-3.5" />
                Support
              </a>
              <span className="text-border">|</span>
              <a href="#" className="hover:text-foreground">
                English (UK)
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark size={20} />
            <span>
              <span className="font-medium text-foreground">Pulses Insights</span>{" "}
              · Visitor Intelligence Platform
            </span>
          </div>
          <span>© {new Date().getFullYear()} Pulses Insights. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
