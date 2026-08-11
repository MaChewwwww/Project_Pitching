import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartPulse, Radio, Shield } from "lucide-react";

import { LogoLockup } from "@/components/common/logo";
import { LoginForm } from "@/components/features/auth/login-form";

/**
 * Login for both barangay staff and self-registered residents (`head` role) — FR-SYS-002.
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-12 overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Mesh Glows */}
      <div className="absolute top-0 left-1/4 size-[500px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 size-[500px] rounded-full bg-teal-600/15 blur-[120px] pointer-events-none animate-pulse" />

      {/* Floating Top Left Back to Home Button */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/80 px-4 py-2 text-xs font-extrabold text-white shadow-xl backdrop-blur-md hover:bg-slate-800 hover:border-emerald-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <ArrowLeft aria-hidden className="size-4 text-emerald-400 shrink-0" />
        <span>Back to Home</span>
      </Link>

      {/* Master 2-Column Auth Card Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl overflow-hidden grid lg:grid-cols-12 min-h-[540px] animate-in fade-in zoom-in-95 duration-300">
        {/* Left Column: Dark Emerald Brand Hero Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-8 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="absolute -bottom-12 -right-12 size-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

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
                Disaster Readiness & Resident Portal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Access official PAGASA flood hazard monitoring, barangay alert levels, and emergency response tools.
              </p>
            </div>
          </div>

          {/* Platform Highlights List */}
          <div className="space-y-3 pt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Project NOAH Hazard GeoJSON Maps</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
              <Radio className="size-4 text-emerald-400 shrink-0" />
              <span>San Jose Siren Units & Alert Prompts</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
              <HeartPulse className="size-4 text-emerald-400 shrink-0" />
              <span>Instant Emergency Rescue Requests</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form Container Panel */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to your account</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                For admins, BHWs, SK officers, and registered household members.
              </p>
            </div>

            <LoginForm />
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
            <p className="text-xs font-medium text-slate-600">
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
