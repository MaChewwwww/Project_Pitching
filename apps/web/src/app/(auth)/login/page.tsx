import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { LoginForm } from "@/components/features/auth/login-form";

/**
 * Login for both barangay staff and self-registered residents (`head` role) — FR-SYS-002.
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50/50 via-slate-50 to-neutral-100 px-4 py-16">
      {/* Top Left Floating Back to Home Button */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white/90 px-4 py-2 text-xs font-extrabold text-neutral-800 shadow-xs backdrop-blur-md hover:border-emerald-600/40 hover:bg-emerald-50/80 hover:text-emerald-950 transition-all cursor-pointer"
      >
        <ArrowLeft aria-hidden className="size-4 text-emerald-700 shrink-0" />
        <span>Back to Home</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl border border-emerald-200/60 bg-white p-3 shadow-2xs">
            <LogoLockup size={40} />
          </div>
          <div className="mt-1">
            <h1 className="text-h2 font-black text-neutral-900">Sign in to SAGIP-SJ</h1>
            <p className="text-body-sm mt-1 font-medium text-neutral-500 max-w-xs mx-auto">
              For admins, BHWs, SK officers, and registered household members.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xl backdrop-blur-md">
          <LoginForm />
        </div>

        <p className="text-body-sm mt-6 text-center text-neutral-600 font-medium">
          Registering a household?{" "}
          <Link
            href="/register"
            className="text-emerald-700 font-bold hover:text-emerald-900 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
