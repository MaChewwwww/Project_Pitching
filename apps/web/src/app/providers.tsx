"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { AuthProvider } from "@/lib/auth/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side providers.
 *
 * TanStack Query owns the server-data cache. Nothing duplicates that cache into
 * Zustand — that is how staleness bugs get created (architecture.md 10.3).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state so each browser session gets one client, and so a server
  // render never shares a cache between two users' requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Readings are polled by the scheduler every 15-20 minutes; refetching
            // faster than that only burns a resident's mobile data.
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
