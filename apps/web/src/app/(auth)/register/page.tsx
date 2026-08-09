import Link from "next/link";

import { LogoLockup } from "@/components/common/logo";
import { RegisterForm } from "@/components/features/auth/register-form";

/**
 * Resident self-registration (FR-SYS-001). Deliberately minimal — account
 * basics only. The household itself (address, area, map pin) is captured
 * afterwards at `/portal/onboarding`, not here.
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoLockup size={40} />
          <div>
            <h1 className="text-h2 text-neutral-900">Create your account</h1>
            <p className="text-body-sm mt-1 text-neutral-600">
              For residents registering a household. You&apos;ll add your address and area
              next.
            </p>
          </div>
        </div>

        <RegisterForm />

        <p className="text-body-sm mt-6 text-center text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
