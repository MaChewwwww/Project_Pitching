"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Menu, Phone, UserPlus } from "lucide-react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "./button";
import { LanguageToggle } from "./language-toggle";
import { LogoLockup } from "./logo";
import { AUTH_HREF, NAV_ITEMS } from "@/lib/content/site";
import { toTelHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicHotline } from "@/lib/api/public-types";

/**
 * The public navigation bar (design.md Sections 7.2 and 9.3).
 *
 * White, 60px on mobile and 72px from `lg`. Logo left, nav centre, filled
 * "Login" pill and outline "Register" pill right — pills because the public site
 * uses `full` radius while the admin console uses `md` (Section 5), a difference
 * that signals "brochure" versus "working tool".
 *
 * Below `lg` the nav collapses into a sheet, but **Login and the hotline stay
 * visible outside the menu** (Section 9.3). Burying either behind a hamburger
 * during an emergency is the failure this rule exists to prevent.
 *
 * Login and Register both point at the registration FAQ: accounts arrive with the
 * registry module, and the FAQ explains how to register in person today. A stub
 * sign-in page would be scope creep; a dead link would look broken.
 */

export interface PublicNavbarProps {
  primaryHotline?: PublicHotline;
}

export function PublicNavbar({ primaryHotline }: PublicNavbarProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    const path = href.split("#")[0];
    if (path === "/" || path === "") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav
        aria-label="Main"
        className="mx-auto flex h-15 max-w-[1440px] items-center gap-3 px-4 md:px-6 lg:h-18"
      >
        <Link
          href="/"
          aria-label="Go to the home page"
          className="focus-visible:ring-ring shrink-0 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogoLockup size={40} />
        </Link>

        {/* Centre nav — lg and up */}
        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "text-label inline-flex h-10 items-center rounded-full px-3.5 transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  isActive(item.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageToggle className="hidden sm:inline-flex" />

          {/* Stays outside the hamburger at every width (Section 9.3). */}
          {primaryHotline ? (
            <a
              href={toTelHref(primaryHotline.number)}
              aria-label={`Call ${primaryHotline.label} at ${primaryHotline.number}`}
              className="tap-48 bg-danger-bg text-danger hover:bg-danger focus-visible:ring-danger grid size-10 place-items-center rounded-full transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            >
              <Phone aria-hidden className="size-[18px]" strokeWidth={2.5} />
            </a>
          ) : null}

          <Button asChild pill size="md" className="hidden sm:inline-flex">
            <Link href={AUTH_HREF}>
              <LogIn aria-hidden className="size-4" />
              Login
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            pill
            size="md"
            className="hidden lg:inline-flex"
          >
            <Link href={AUTH_HREF}>
              <UserPlus aria-hidden className="size-4" />
              Register
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="tap-48 focus-visible:ring-ring grid size-10 place-items-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            >
              <Menu aria-hidden className="size-5" />
            </SheetTrigger>

            <SheetContent side="right" className="w-[min(20rem,85vw)] p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-neutral-200 p-4">
                  <SheetTitle asChild>
                    <span>
                      <LogoLockup size={32} />
                    </span>
                  </SheetTitle>
                </div>

                <ul className="flex flex-col gap-1 p-3">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={cn(
                          "text-body flex min-h-12 items-center rounded-md px-3 transition-colors",
                          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                          isActive(item.href)
                            ? "bg-primary-50 text-primary-700 font-semibold"
                            : "text-neutral-700 hover:bg-neutral-100",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2 border-t border-neutral-200 p-4">
                  <LanguageToggle className="self-start sm:hidden" />
                  <Button asChild pill size="lg" className="w-full sm:hidden">
                    <Link href={AUTH_HREF} onClick={() => setOpen(false)}>
                      <LogIn aria-hidden className="size-4" />
                      Login
                    </Link>
                  </Button>
                  <Button asChild variant="outline" pill size="lg" className="w-full">
                    <Link href={AUTH_HREF} onClick={() => setOpen(false)}>
                      <UserPlus aria-hidden className="size-4" />
                      Register
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
