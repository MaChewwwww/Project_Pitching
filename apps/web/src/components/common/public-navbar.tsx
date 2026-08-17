"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CloudRain,
  HandHeart,
  House,
  Info,
  LifeBuoy,
  LogIn,
  Map,
  Megaphone,
  Menu,
  Phone,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "./button";
import { LanguageToggle } from "./language-toggle";
import { LogoLockup } from "./logo";
import { LOGIN_HREF, REGISTER_HREF, NAV_GROUPS, type NavItem } from "@/lib/content/site";
import { useAuth } from "@/lib/auth/auth-context";
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
 * **The nav is grouped into three dropdowns**, not a flat row. Eight public
 * destinations do not fit inline at 1024px, and the three groups already existed
 * as the footer's columns — this makes one source serve both.
 *
 * Below `lg` the groups collapse into a sheet, but **Login and the hotline stay
 * visible outside the menu** (Section 9.3). Burying either behind a hamburger
 * during an emergency is the failure this rule exists to prevent.
 *
 * Login and Register both go to real pages now — the shared `/login` and the
 * minimal `/register` (account basics only; the household itself is completed
 * afterwards at `/portal/onboarding`).
 *
 * Two things about the Radix primitive are load-bearing here:
 *
 * `viewport={false}` — the default `NavigationMenuViewport` wraps content in an
 * `absolute … isolate z-50` div sized from a measured CSS variable. Inside this
 * `backdrop-blur` header, itself inside `PublicShell`'s sticky `z-50` container,
 * that is a third stacking context for no gain. Per-item content skips it.
 *
 * The Root renders its own `<nav aria-label="Main">`, so this component must not
 * add a second one — two identically-labelled navigation landmarks is worse for a
 * screen reader than one unlabelled.
 *
 * **Active trigger**: We use a bottom underline + text colour change rather than a
 * filled-pill background. The filled-pill approach conflicted with Radix's own
 * `data-[state=open]` styles — when the dropdown opened, Radix's specificity won
 * and the background disappeared. The underline is set with a pure CSS border-b
 * that Radix never touches.
 */

/** Maps the icon string from site.ts to the actual Lucide component. */
const ICON_MAP: Record<string, LucideIcon> = {
  Map,
  Building2,
  BookOpen,
  CloudRain,
  Megaphone,
  CalendarDays,
  HandHeart,
  CircleHelp,
  House,
  Info,
  LifeBuoy,
};

export interface PublicNavbarProps {
  primaryHotline?: PublicHotline;
}

export function PublicNavbar({ primaryHotline }: PublicNavbarProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const accountHref = user?.role === "head" ? "/portal" : "/admin/households";
  const accountLabel = "Return to Portal";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /** A group is current when any of its destinations is. */
  const isGroupActive = (items: { href: string }[]) =>
    items.some((i) => isActive(i.href));

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-[1440px] items-center gap-3 px-4 md:px-6 lg:h-18">
        <Link
          href="/"
          aria-label="Go to the home page"
          className="focus-visible:ring-ring shrink-0 rounded-md transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogoLockup size={40} />
        </Link>

        {/* Centre nav — lg and up. Renders its own <nav aria-label="Main">. */}
        <NavigationMenu
          viewport={false}
          className="mx-auto hidden max-w-none lg:flex"
          delayDuration={100}
        >
          <NavigationMenuList className="gap-1">
            {NAV_GROUPS.map((group) => {
              const groupActive = isGroupActive(group.items);
              return (
                <NavigationMenuItem key={group.title}>
                  {/*
                   * Trigger styling strategy: text-decoration underline for the active
                   * indicator. text-decoration follows the label text width only —
                   * the chevron is excluded — so the underline is always symmetric
                   * under the label regardless of button width.
                   *
                   * A previous after: pseudo-element approach centered on the full
                   * button width, which made the underline appear off-center because
                   * the chevron shifted the label left of the button midpoint.
                   */}
                  <NavigationMenuTrigger
                    className={cn(
                      "group/trigger text-label h-10 rounded-lg px-4 transition-all duration-150",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      "[text-decoration-thickness:2px] [text-underline-offset:5px]",
                      groupActive
                        ? "text-primary-700 bg-primary-50 decoration-primary-600 data-[state=open]:bg-primary-100 font-semibold underline"
                        : "text-neutral-600 no-underline hover:bg-neutral-100 hover:text-neutral-900 data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-900",
                    )}
                  >
                    {group.title}
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10">
                    <ul className="grid w-[24rem] gap-1 p-2.5">
                      {group.items.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon ? ICON_MAP[item.icon] : undefined;
                        return (
                          <li key={item.href}>
                            <NavigationMenuLink asChild active={active}>
                              <Link
                                href={item.href}
                                className={cn(
                                  "group flex items-center gap-4 rounded-xl p-3.5 transition-all duration-200",
                                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                                  active
                                    ? "bg-primary-50 shadow-[0_0_0_1px_theme(colors.primary.200),0_4px_16px_-4px_rgba(31,128,73,0.18)]"
                                    : "hover:bg-primary-100 hover:shadow-[0_0_0_1px_theme(colors.primary.200),0_4px_20px_-4px_rgba(31,128,73,0.14)]",
                                )}
                              >
                                {/* Icon box */}
                                <span
                                  className={cn(
                                    "flex size-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                                    active
                                      ? "bg-primary-600 text-white"
                                      : "group-hover:bg-primary-100 group-hover:text-primary-700 bg-neutral-100 text-neutral-500",
                                  )}
                                >
                                  {Icon ? (
                                    <Icon
                                      aria-hidden
                                      className="size-[18px]"
                                      strokeWidth={2}
                                    />
                                  ) : null}
                                </span>

                                {/* Text */}
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span
                                    className={cn(
                                      "text-label transition-colors duration-150",
                                      active
                                        ? "text-primary-700 font-semibold"
                                        : "group-hover:text-primary-800 text-neutral-800",
                                    )}
                                  >
                                    {item.label}
                                  </span>
                                  {item.description ? (
                                    <span
                                      className={cn(
                                        "text-caption leading-snug transition-colors duration-150",
                                        active
                                          ? "text-primary-600/70"
                                          : "text-neutral-500 group-hover:text-neutral-600",
                                      )}
                                    >
                                      {item.description}
                                    </span>
                                  ) : null}
                                </span>

                                {/* Arrow — slides in on hover */}
                                <ArrowRight
                                  aria-hidden
                                  className={cn(
                                    "size-4 shrink-0 transition-all duration-150",
                                    active
                                      ? "text-primary-500 opacity-100"
                                      : "-translate-x-1 text-neutral-400 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                                  )}
                                />
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageToggle className="hidden sm:inline-flex" />

          {/* Stays outside the hamburger at every width (Section 9.3). */}
          {primaryHotline ? (
            <a
              href="#footer"
              aria-label="Emergency hotlines in footer"
              className="tap-48 bg-danger-bg text-danger hover:bg-danger focus-visible:ring-danger grid size-10 place-items-center rounded-full transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            >
              <Phone aria-hidden className="size-[18px]" strokeWidth={2.5} />
            </a>
          ) : null}

          {user ? (
            <Button asChild pill size="md" className="group hidden sm:inline-flex">
              <Link href={accountHref}>
                {accountLabel}
                <ArrowRight
                  aria-hidden
                  className="size-4.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild pill size="md" className="hidden sm:inline-flex">
                <Link href={LOGIN_HREF}>
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
                <Link href={REGISTER_HREF}>
                  <UserPlus aria-hidden className="size-4" />
                  Register
                </Link>
              </Button>
            </>
          )}

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

                <nav
                  aria-label="Main"
                  className="flex flex-col gap-1 overflow-y-auto p-3"
                >
                  {NAV_GROUPS.map((group) => (
                    <MobileNavGroup
                      key={group.title}
                      title={group.title}
                      items={group.items}
                      isActive={isActive}
                      defaultOpen={true}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2 border-t border-neutral-200 p-4">
                  <LanguageToggle fullWidth className="w-full sm:hidden" />
                  {user ? (
                    <Button asChild pill size="lg" className="group w-full">
                      <Link href={accountHref} onClick={() => setOpen(false)}>
                        {accountLabel}
                        <ArrowRight
                          aria-hidden
                          className="size-4.5 transition-transform duration-150 group-hover:translate-x-0.5"
                          strokeWidth={2.5}
                        />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild pill size="lg" className="w-full sm:hidden">
                        <Link href={LOGIN_HREF} onClick={() => setOpen(false)}>
                          <LogIn aria-hidden className="size-4" />
                          Login
                        </Link>
                      </Button>
                      <Button asChild variant="outline" pill size="lg" className="w-full">
                        <Link href={REGISTER_HREF} onClick={() => setOpen(false)}>
                          <UserPlus aria-hidden className="size-4" />
                          Register
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/**
 * One collapsible group in the mobile sheet.
 *
 * Opens by default when it contains the current page, so a resident who arrived on
 * `/weather` and opens the menu can see where they are without expanding anything.
 */
function MobileNavGroup({
  title,
  items,
  isActive,
  defaultOpen,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  defaultOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="text-label focus-visible:ring-ring group flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:outline-none">
        {title}
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="my-1 ml-3 flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon ? ICON_MAP[item.icon] : undefined;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-11 items-center gap-3 rounded-lg px-3 transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-primary-50 text-primary-700 font-semibold"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                  )}
                >
                  {Icon ? (
                    <Icon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-primary-600"
                          : "text-neutral-400 group-hover:text-neutral-600",
                      )}
                      strokeWidth={2}
                    />
                  ) : null}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
