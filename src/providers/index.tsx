"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

/**
 * Client-side application providers.
 *
 * - QueryClientProvider: TanStack Query — the data layer every widget will
 *   fetch through (created once per app instance via useState).
 * - ThemeProvider: next-themes, class-based to match the `.dark` variant in
 *   globals.css.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Widget data is derived deterministically from the filters in the
            // URL, so a cached response stays correct for as long as we keep
            // it. A long staleTime is what makes navigating back to a page you
            // already visited render from cache instead of refetching.
            staleTime: 5 * 60 * 1000,
            // Outlives staleTime so returning to a page after a detour still
            // has its entries to serve while any refetch happens.
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            // The mock backend either answers or reports a real error; retrying
            // three times just delays the error state a widget wants to show.
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
