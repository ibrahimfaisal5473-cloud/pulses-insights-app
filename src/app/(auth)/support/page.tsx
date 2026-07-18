"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, Phone, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/brand-mark";

const BRAND = "#D71921";
const BRAND_HOVER = "#B4141B";

/** Shared with the Input component so the textarea sits on the same styling. */
const FIELD =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, issue }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reference?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Unable to send your request.");
        return;
      }
      setReference(data.reference ?? null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-xs sm:p-12">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <BrandMark size={24} />
              <span className="text-sm font-medium text-muted-foreground">
                Insights
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: BRAND }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>

          {reference ? (
            /* ---------- Submitted ---------- */
            <div className="mt-8">
              <CheckCircle2 className="h-10 w-10 text-chart-5" />
              <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight">
                Request received
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your reference is{" "}
                <span className="font-medium text-foreground">{reference}</span>.
                The IT support team will get back to you on the email and phone
                number you provided. Quote this reference in any follow-up.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className={buttonVariants({ className: "h-10 px-5 text-white" })}
                  style={{ backgroundColor: BRAND }}
                >
                  Back to login
                </Link>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setReference(null);
                    setEmail("");
                    setPhone("");
                    setIssue("");
                  }}
                >
                  Submit another request
                </Button>
              </div>
            </div>
          ) : (
            /* ---------- Form ---------- */
            <>
              <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight">
                Contact IT Support
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Trouble signing in or using the dashboard? Tell us how to reach
                you and what went wrong, and the IT support team will follow up.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="h-10 pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+971 4 000 0000"
                      autoComplete="tel"
                      className="h-10 pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="issue">Describe the issue</Label>
                  <textarea
                    id="issue"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="What were you trying to do, and what happened instead?"
                    rows={6}
                    maxLength={2000}
                    className={FIELD}
                    required
                  />
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
                  className="h-11 w-full text-white sm:w-auto sm:self-start sm:px-6"
                  style={{ backgroundColor: loading ? BRAND_HOVER : BRAND }}
                >
                  {loading ? (
                    "Sending…"
                  ) : (
                    <>
                      Send request
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold tracking-wide uppercase">
                  Before you contact us
                </p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    Confirm your email or username is spelled correctly and that
                    Caps Lock is off.
                  </li>
                  <li>
                    Include the time the issue occurred and what you were doing
                    at the time — it speeds up diagnosis considerably.
                  </li>
                </ul>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Access to Insights is restricted to authorised personnel. All
            activities are logged and monitored.
          </p>
        </div>
      </main>
    </div>
  );
}
