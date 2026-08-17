"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, LogOut, Menu } from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { AdminBreadcrumbs } from "@/components/features/admin/admin-breadcrumbs";
import { AdminNotificationsPopover } from "@/components/features/admin/admin-notifications-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_CATEGORIES } from "@/lib/admin-nav";
import { type SessionUser, useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

function ConsoleProfileMenu({
  user,
  onLogout,
  compact = false,
}: {
  user: SessionUser | null;
  onLogout: () => Promise<void>;
  compact?: boolean;
}) {
  const initial = user?.full_name?.trim().charAt(0).toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2 focus-visible:outline-none",
            compact &&
              "border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15",
          )}
          aria-label="Open profile menu"
        >
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white ring-2 ring-emerald-100",
              compact && "size-7 text-[11px] ring-1 ring-emerald-100",
            )}
          >
            {initial}
          </span>
          {!compact ? (
            <span className="min-w-0 pr-1">
              <span className="block max-w-36 truncate text-xs font-bold text-neutral-900">
                {user?.full_name ?? "Barangay staff"}
              </span>
              <span className="block text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
                {user?.role ?? "staff"}
              </span>
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-neutral-400 transition-transform group-data-[state=open]:rotate-180",
              compact && "text-primary-100",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border border-emerald-100 bg-white p-1.5 shadow-lg shadow-emerald-950/10"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white ring-2 ring-emerald-100">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-neutral-900">
              {user?.full_name ?? "Barangay staff"}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-neutral-500">
              {user?.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 px-2.5 py-2 text-sm font-semibold">
          <Link href="/" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden className="size-4" />
            View public site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="gap-2 px-2.5 py-2 text-sm font-semibold"
          onSelect={() => void onLogout()}
        >
          <LogOut aria-hidden className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useIsActive() {
  const pathname = usePathname();
  return React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );
}

function ConsoleNav({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive();
  const { user } = useAuth();

  // Keep the full navigation visible after every reload. Officers can still
  // collapse a group temporarily when they need more room on a short screen.
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(ADMIN_CATEGORIES.map((category) => [category.id, true])),
  );

  return (
    <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
      <div className="space-y-1.5">
        {ADMIN_CATEGORIES.map((category) => {
          const items = category.items.filter(
            (item) => !item.roles || (!!user && item.roles.includes(user.role)),
          );
          if (items.length === 0) return null;
          const hasActiveChild = items.some((item) => isActive(item.href));
          const isOpen = hasActiveChild || Boolean(openCategories[category.id]);
          const CategoryIcon = category.icon;

          return (
            <div key={category.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenCategories((prev) => ({ ...prev, [category.id]: !isOpen }))
                }
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[10px] font-bold tracking-[0.12em] uppercase transition-colors",
                  hasActiveChild
                    ? "text-primary-100"
                    : "text-primary-300 hover:text-white",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CategoryIcon
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0",
                      hasActiveChild ? "text-primary-200" : "text-primary-400",
                    )}
                  />
                  <span className="truncate">{category.title}</span>
                </span>
                {isOpen ? (
                  <ChevronDown
                    aria-hidden
                    className="text-primary-400 size-3.5 shrink-0"
                  />
                ) : (
                  <ChevronRight
                    aria-hidden
                    className="text-primary-400 size-3.5 shrink-0"
                  />
                )}
              </button>

              {isOpen ? (
                <ul className="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-2">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    const ItemIcon = item.icon;

                    return (
                      <li key={item.href} className="relative">
                        {active ? (
                          <span
                            aria-hidden
                            className="bg-primary-300 absolute top-1/2 -left-2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                          />
                        ) : null}
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs transition-colors",
                            active
                              ? "bg-white/15 font-bold text-white"
                              : "text-primary-200 font-medium hover:bg-white/10 hover:text-white",
                          )}
                        >
                          <ItemIcon
                            aria-hidden
                            className={cn(
                              "size-3.5 shrink-0",
                              active ? "text-primary-100" : "text-primary-400",
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="bg-primary-950 text-primary-50 hidden h-svh w-64 shrink-0 flex-col lg:sticky lg:top-0 lg:flex lg:self-start">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoLockup size={32} variant="mark" onDark />
            <span className="flex min-w-0 flex-col">
              <span className="text-body-sm truncate leading-none font-bold tracking-tight text-white">
                SAGIP-SJ
              </span>
              <span className="text-primary-200 mt-1 truncate text-[11px] font-medium">
                Barangay San Jose
              </span>
            </span>
          </div>
        </div>

        <ConsoleNav />

        <div className="bg-primary-950/80 mt-auto border-t border-white/10 p-3">
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="size-3" />
              Public Site
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-rose-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200"
            >
              <LogOut className="size-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between gap-4 border-b border-neutral-200 bg-white/95 px-6 backdrop-blur lg:flex xl:px-8">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <AdminNotificationsPopover />
            <ConsoleProfileMenu user={user} onLogout={logout} />
          </div>
        </header>

        <header className="bg-primary-950 sticky top-0 z-20 flex h-14 items-center justify-between gap-2 px-4 text-white lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="text-primary-100 -ml-1 rounded p-2 hover:bg-white/10"
                >
                  <Menu aria-hidden className="size-5" />
                  <span className="sr-only">Open console navigation</span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-primary-950 flex w-80 flex-col border-0 p-0 text-white"
              >
                <SheetTitle className="sr-only">Console navigation</SheetTitle>
                <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
                  <LogoLockup size={32} variant="mark" onDark />
                  <span className="text-body-sm font-bold text-white">SAGIP-SJ</span>
                </div>
                <ConsoleNav onNavigate={() => setMobileNavOpen(false)} />
                <div className="bg-primary-950/80 mt-auto border-t border-white/10 p-3">
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <Link
                      href="/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="size-3" />
                      Public Site
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold text-rose-300 transition-colors hover:bg-rose-950/50 hover:text-rose-200"
                    >
                      <LogOut className="size-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <LogoLockup size={32} variant="mark" onDark />
          </div>
          <div className="flex items-center gap-2">
            <AdminNotificationsPopover compact />
            <ConsoleProfileMenu user={user} onLogout={logout} compact />
          </div>
        </header>

        <div className="border-b border-neutral-200 bg-white px-4 py-2 lg:hidden">
          <AdminBreadcrumbs />
        </div>

        <main
          key={pathname}
          className="animate-portal-enter min-w-0 flex-1 p-4 md:p-6 xl:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
