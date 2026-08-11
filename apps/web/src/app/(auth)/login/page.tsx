import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartPulse, Radio, Shield } from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { LoginForm } from "@/components/features/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SAGIP San Jose portal.",
};

/**
 * Login for both barangay staff and self-registered residents (`head` role) — FR-SYS-002.
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-emerald-950 px-4 py-6 sm:py-12 overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Mint & Emerald Glows */}
      <div className="absolute top-0 left-1/4 size-[500px] rounded-full bg-emerald-600/15 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 size-[500px] rounded-full bg-green-600/10 blur-[130px] pointer-events-none animate-pulse" />

      {/* Top Left Fixed Back to Home Button */}
      <Link
        href="/"
        className="fixed top-4 left-4 sm:top-5 sm:left-5 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-900/90 px-3.5 py-2 text-xs font-extrabold text-white shadow-lg backdrop-blur-md hover:bg-emerald-800 hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <ArrowLeft aria-hidden className="size-4 text-emerald-400 shrink-0" />
        <span>Back to Home</span>
      </Link>

      {/* Mobile-Only Centered Logo Header */}
      <div className="lg:hidden flex justify-center pt-10 pb-4">
        <LogoLockup size={32} onDark />
      </div>

      {/* Master Auth Card Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-emerald-700/40 bg-emerald-950/80 shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12 min-h-[500px] animate-in fade-in zoom-in-95 duration-300">
        {/* Left Column: Rich Deep Emerald Hero Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 p-8 text-white flex-col justify-between relative overflow-hidden border-r border-emerald-700/30 shadow-inner">
          <div className="absolute -bottom-12 -right-12 size-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          {/* Logo & Platform Info */}
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-3">
              <LogoLockup size={40} onDark />
            </div>

            <div className="space-y-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700/40 border border-emerald-500/40 px-3 py-1 text-[11px] font-extrabold text-emerald-200 uppercase tracking-wider backdrop-blur-md shadow-xs">
                <Shield aria-hidden className="size-3.5 text-emerald-300" />
                San Jose Platform
              </span>
              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                Disaster Readiness & Resident Portal
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                Access official PAGASA flood hazard monitoring, barangay alert levels, and emergency response tools.
              </p>
            </div>
          </div>

          {/* Platform Highlights List */}
          <div className="space-y-3 pt-6 border-t border-emerald-700/40 relative z-10">
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-semibold">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Project NOAH Hazard GeoJSON Maps</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-semibold">
              <Radio className="size-4 text-emerald-400 shrink-0" />
              <span>San Jose Siren Units & Alert Prompts</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-semibold">
              <HeartPulse className="size-4 text-emerald-400 shrink-0" />
              <span>Instant Emergency Rescue Requests</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form Container Panel */}
        <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-5 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Sign in to your account</h1>
              <p className="text-xs font-medium text-neutral-500 mt-1">
                For admins, BHWs, SK officers, and registered household members.
              </p>
            </div>

            <LoginForm />
          </div>

          <div className="pt-5 mt-5 border-t border-neutral-100 text-center">
            <p className="text-xs font-medium text-neutral-600">
              Registering a household?{" "}
              <Link href="/register" className="text-emerald-700 font-extrabold hover:text-emerald-900 hover:underline transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
