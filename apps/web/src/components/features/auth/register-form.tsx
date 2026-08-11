"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import type { ProblemDetail } from "@/lib/api/client";

/**
 * FR-SYS-001 — account basics only.
 */

const registerSchema = z
  .object({
    full_name: z.string().min(1, "Enter your full name"),
    email: z
      .string()
      .min(1, "Enter your email address")
      .email("Enter a valid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      await registerAccount({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
      });
      router.push("/portal");
    } catch (error) {
      const problem = error as ProblemDetail;
      setServerError(problem.detail ?? "Could not create your account. Try again.");
      for (const fieldError of problem.errors ?? []) {
        setError(fieldError.field as keyof RegisterFormValues, {
          message: fieldError.message,
        });
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3.5"
    >
      {serverError ? (
        <div
          role="alert"
          className="border-red-200 bg-red-50 text-red-700 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="full_name" className="text-xs font-bold text-slate-700">Full Name</Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          className="h-9.5 text-xs rounded-xl border-slate-200 focus:border-emerald-600 transition-all"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
          {...registerField("full_name")}
        />
        {errors.full_name ? (
          <p id="full_name-error" className="text-red-600 text-[11px] font-semibold">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="username"
          className="h-9.5 text-xs rounded-xl border-slate-200 focus:border-emerald-600 transition-all"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...registerField("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-red-600 text-[11px] font-semibold">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className="h-9.5 text-xs rounded-xl border-slate-200 focus:border-emerald-600 pr-10 transition-all"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...registerField("password")}
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">Confirm Password</Label>
        <div className="relative flex items-center">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repeat password"
            autoComplete="new-password"
            className="h-9.5 text-xs rounded-xl border-slate-200 focus:border-emerald-600 pr-10 transition-all"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            {...registerField("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            tabIndex={-1}
            title={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
          >
            {showConfirmPassword ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword ? (
          <p id="confirmPassword-error" className="text-red-600 text-[11px] font-semibold">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1.5 h-11 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md cursor-pointer w-full transition-all active:scale-[0.99]"
      >
        <UserPlus aria-hidden className="size-4" />
        {isSubmitting ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}
