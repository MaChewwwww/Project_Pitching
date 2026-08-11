"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import type { ProblemDetail } from "@/lib/api/client";

/**
 * The staff sign-in form (FR-SYS-002).
 */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Enter your email address")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      router.push("/admin");
    } catch (error) {
      const problem = error as ProblemDetail;
      setServerError(problem.detail ?? "Could not sign in. Try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {serverError ? (
        <div
          role="alert"
          className="border-red-200 bg-red-50 text-red-700 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-semibold"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="username"
          className="h-10 text-xs rounded-xl border-slate-200 focus:border-emerald-600"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-red-600 text-[11px] font-semibold">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-10 text-xs rounded-xl border-slate-200 focus:border-emerald-600 pr-10"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-red-600 text-[11px] font-semibold">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 h-11 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer w-full"
      >
        <LogIn aria-hidden className="size-4" />
        {isSubmitting ? "Signing in…" : "Sign in to Dashboard"}
      </Button>
    </form>
  );
}
