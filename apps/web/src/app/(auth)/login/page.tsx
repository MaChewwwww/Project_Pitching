import { LogoLockup } from "@/components/common/logo";
import { LoginForm } from "@/components/features/auth/login-form";

/**
 * Staff login (FR-SYS-002). Standalone — no public shell
 * (`apps/web/src/app/(auth)/README.md`).
 *
 * There is no self-registration path here: FR-SYS-001 (resident self-registration)
 * is out of scope for this pass. Accounts are seeded or barangay-created.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <LogoLockup size={40} />
          <div>
            <h1 className="text-h2 text-neutral-900">Barangay staff sign in</h1>
            <p className="text-body-sm mt-1 text-neutral-600">
              For admins, BHWs, and SK officers. Residents do not need an account to use
              this site.
            </p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
