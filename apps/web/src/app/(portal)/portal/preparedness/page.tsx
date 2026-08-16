import Link from "next/link";
import { ArrowRight, Backpack, FileText, ShieldCheck } from "lucide-react";

const links = [
  {
    href: "/portal/preparedness/go-bag",
    title: "Go-bag checklist",
    text: "Track essential supplies for your household.",
    icon: Backpack,
  },
  {
    href: "/portal/preparedness/family-plan",
    title: "Family emergency plan",
    text: "Save a meeting place and outside contact.",
    icon: FileText,
  },
  {
    href: "/guides",
    title: "Preparedness guides",
    text: "Read the barangay’s published guidance.",
    icon: ShieldCheck,
  },
];
export default function PortalPreparednessPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-primary-700 text-xs font-extrabold tracking-[.16em] uppercase">
        Before an emergency
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Preparedness</h1>
      <p className="mt-2 text-sm text-neutral-600">
        A few clear steps make it easier for your household to act quickly.
      </p>
      <div className="mt-7 divide-y divide-neutral-200 border-y border-neutral-200">
        {links.map(({ href, title, text, icon: Icon }) => (
          <Link
            key={href}
            href={href as never}
            className="flex min-h-20 items-center gap-4 py-4"
          >
            <span className="bg-primary-100 text-primary-700 grid size-11 place-items-center rounded-2xl">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="mt-1 block text-sm text-neutral-600">{text}</span>
            </span>
            <ArrowRight className="ml-auto size-4 text-neutral-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
