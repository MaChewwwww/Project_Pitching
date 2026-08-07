import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { PublicShell } from "@/components/common/public-shell";
import { getActiveAlert, getHotlines, getPrimaryHotline } from "@/lib/api/public";

/**
 * A URL that matches no route at all.
 *
 * Distinct from `(public)/not-found.tsx`, which handles a `notFound()` thrown
 * from inside a public page (an unknown guide slug, say). A completely unmatched
 * path never enters the `(public)` route group, so routing walks straight past
 * that file to this one — which is why both exist.
 *
 * Without this, Next renders its built-in 404: a bare "This page could not be
 * found" with no navigation and, more to the point, **no hotline**. NFR-AVL-004
 * does not carve out an exception for mistyped URLs, and a resident who fat-
 * fingered an address during a flood is exactly the person who cannot afford a
 * dead end. So the shell is mounted here explicitly.
 */
export default async function NotFound() {
  const [activeAlert, hotlines, primaryHotline] = await Promise.all([
    getActiveAlert(),
    getHotlines(),
    getPrimaryHotline(),
  ]);

  return (
    <PublicShell
      activeAlert={activeAlert}
      hotlines={hotlines}
      primaryHotline={primaryHotline}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24">
        <EmptyState
          icon={Compass}
          title="We could not find that page"
          description="It may have been moved or renamed. Everything on this site is reachable from the home page."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild pill size="lg">
                <Link href="/">Back to home</Link>
              </Button>
              <Button asChild variant="outline" pill size="lg">
                <Link href="/help">Help &amp; FAQs</Link>
              </Button>
            </div>
          }
        />

        <div className="mt-12">
          <p className="text-overline mb-3 text-center text-neutral-500">
            Emergency hotlines
          </p>
          <HotlineList hotlines={hotlines} />
        </div>
      </div>
    </PublicShell>
  );
}
