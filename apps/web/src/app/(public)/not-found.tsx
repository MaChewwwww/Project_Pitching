import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { HotlineList } from "@/components/common/hotline-list";
import { HOTLINES } from "@/lib/fixtures/hotlines";

/**
 * A public URL that does not exist — an unknown guide slug, a stale bookmark, a
 * mistyped address.
 *
 * **This lives at the route-group level, not inside `guides/[slug]/`.** A
 * `not-found.tsx` nested that deep is not reached: the whole segment is what
 * failed to resolve, so Next walks up past it and falls through to the root
 * not-found — which renders outside `PublicShell` and therefore without the
 * navbar, footer, or a single hotline. Placing it here keeps the shell, which is
 * what NFR-AVL-004 requires: no page on this site is a dead end during an
 * emergency.
 *
 * The hotlines are repeated inline for the same reason they are in `error.tsx` —
 * somebody who mistyped a URL during a flood should not have to find the right
 * page first.
 */
export default function PublicNotFound() {
  return (
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
              <Link href="/guides">Preparedness guidelines</Link>
            </Button>
          </div>
        }
      />

      <div className="mt-12">
        <p className="text-overline mb-3 text-center text-neutral-500">
          Emergency hotlines
        </p>
        <HotlineList hotlines={HOTLINES} />
      </div>
    </div>
  );
}
