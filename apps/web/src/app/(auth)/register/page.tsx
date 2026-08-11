import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartPulse, Radio, Shield } from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { RegisterForm } from "@/components/features/auth/register-form";

/**
 * Resident self-registration (FR-SYS-001).
 */
export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-emerald-950 px-4 py-8 sm:py-12 overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Mint & Emerald Glows (NO BLUE) */}
      <div className="absolute top-0 left-1/4 size-[500px] rounded-full bg-emerald-600/20 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 size-[500px] rounded-full bg-green-500/20 blur-[130px] pointer-events-none animate-pulse" />

      {/* Navigation Header */}
      <header className="w-full max-w-4xl mb-4 sm:mb-0 flex items-center justify-between sm:block">
        <Link
          href="/"
          className="sm:fixed sm:top-5 sm:left-5 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-900/90 px-3.5 py-2 text-xs font-extrabold text-white shadow-lg backdrop-blur-md hover:bg-emerald-800 hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft aria-hidden className="size-4 text-emerald-400 shrink-0" />
          <span>Back to Home</span>
        </Link>
        <div className="sm:hidden">
          <LogoLockup size={32} onDark />
        </div>
      </header>

      {/* Master Auth Card Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-emerald-800/40 bg-emerald-950/80 shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12 min-h-[500px] animate-in fade-in zoom-in-95 duration-300">
        {/* Left Column: Deep Emerald Brand Hero Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-950 to-green-950 p-8 text-white flex-col justify-between relative overflow-hidden border-r border-emerald-800/30">
          <div className="absolute -bottom-12 -right-12 size-56 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

          {/* Logo & Platform Info */}
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-3">
              <LogoLockup size={40} onDark />
            </div>

            <div className="space-y-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider">
                <Shield aria-hidden className="size-3.5 text-emerald-400" />
                San Jose Platform
              </span>
              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                Household Registration
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed font-normal">
                Register your household account to access safety guides, family status updates, and emergency assistance.
              </p>
            </div>
          </div>

          {/* Platform Highlights List */}
          <div className="space-y-3 pt-6 border-t border-emerald-800/40 relative z-10">
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Quick Account Setup for San Jose Heads</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <Radio className="size-4 text-emerald-400 shrink-0" />
              <span>Direct Emergency Siren Notifications</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
              <HeartPulse className="size-4 text-emerald-400 shrink-0" />
              <span>Priority Evacuation Center Tracking</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form Container Panel */}
        <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-5 sm:mb-6">
              <div className="hidden sm:block lg:hidden mb-4">
                <LogoLockup size={32} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Create your account</h1>
              <p className="text-xs font-medium text-neutral-500 mt-1">
                For San Jose residents registering a household. You&apos;ll set up address details next.
              </p>
            </div>

            <RegisterForm />
          </div>

          <div className="pt-5 mt-5 border-t border-neutral-100 text-center">
            <p className="text-xs font-medium text-neutral-600">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-700 font-extrabold hover:text-emerald-900 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
