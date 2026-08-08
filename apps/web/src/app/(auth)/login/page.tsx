import Link from "next/link";

import { LogoLockup } from "@/components/common/logo";
import { LoginForm } from "@/components/features/auth/login-form";

/**
 * Login for both barangay staff and self-registered residents (`head` role) —
 * FR-SYS-002. Standalone — no public shell (`apps/web/src/app/(auth)/README.md`).
 *
 * FR-SYS-001 (resident self-registration) now has a real `/register` flow;
 * this page's copy used to say otherwise.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoLockup size={40} />
          <div>
            <h1 className="text-h2 text-neutral-900">Sign in</h1>
            <p className="text-body-sm mt-1 text-neutral-600">
              For admins, BHWs, SK officers, and residents with a household account.
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="text-body-sm mt-6 text-center text-neutral-600">
          Registering a household?{" "}
          <Link href="/register" className="text-primary-700 font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
