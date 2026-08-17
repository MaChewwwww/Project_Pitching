"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import type { ProblemDetail } from "@/lib/api/client";
import { RegistrationTermsDialog } from "./registration-terms-dialog";

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
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsOpen, setTermsOpen] = React.useState(false);
  const [termsError, setTermsError] = React.useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    if (!termsAccepted) {
      setTermsError(
        "Review and accept the Terms & Conditions before creating your account.",
      );
      setTermsOpen(true);
      return;
    }

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5">
      {serverError ? (
        <div
          role="alert"
          className="animate-in fade-in slide-in-from-top-1 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 duration-200"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="full_name" className="text-xs font-bold text-slate-700">
          Full Name
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          className="h-9.5 rounded-xl border-slate-200 text-xs transition-all focus:border-emerald-600"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
          {...registerField("full_name")}
        />
        {errors.full_name ? (
          <p id="full_name-error" className="text-[11px] font-semibold text-red-600">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="username"
          className="h-9.5 rounded-xl border-slate-200 text-xs transition-all focus:border-emerald-600"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...registerField("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-[11px] font-semibold text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700">
          Password
        </Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className="h-9.5 rounded-xl border-slate-200 pr-10 text-xs transition-all focus:border-emerald-600"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...registerField("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 flex cursor-pointer items-center text-slate-400 transition-colors hover:text-slate-700 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-[11px] font-semibold text-red-600">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">
          Confirm Password
        </Label>
        <div className="relative flex items-center">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repeat password"
            autoComplete="new-password"
            className="h-9.5 rounded-xl border-slate-200 pr-10 text-xs transition-all focus:border-emerald-600"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "confirmPassword-error" : undefined
            }
            {...registerField("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            tabIndex={-1}
            title={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-3 flex cursor-pointer items-center text-slate-400 transition-colors hover:text-slate-700 focus:outline-none"
          >
            {showConfirmPassword ? (
              <EyeOff aria-hidden className="size-4" />
            ) : (
              <Eye aria-hidden className="size-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword ? (
          <p
            id="confirmPassword-error"
            className="text-[11px] font-semibold text-red-600"
          >
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <div className="border-primary-100 bg-primary-50/45 rounded-xl border p-3.5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="registration-terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => {
              if (checked === true) {
                setTermsOpen(true);
              } else {
                setTermsAccepted(false);
                setTermsError(null);
              }
            }}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? "registration-terms-error" : undefined}
            className="border-primary-300 data-checked:border-primary-600 data-checked:bg-primary-600 mt-0.5 size-4"
          />
          <div className="min-w-0 flex-1 text-xs leading-relaxed text-neutral-600">
            <label
              htmlFor="registration-terms"
              className="cursor-pointer font-medium text-neutral-700"
            >
              I agree to the SAGIP-SJ Terms &amp; Conditions.
            </label>{" "}
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="text-primary-700 decoration-primary-300 hover:text-primary-900 hover:decoration-primary-600 focus-visible:ring-primary-500 font-bold underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Read terms
            </button>
            {termsAccepted ? (
              <span className="text-primary-700 mt-1 block text-[11px] font-bold">
                Terms accepted.
              </span>
            ) : null}
          </div>
        </div>
        {termsError ? (
          <p
            id="registration-terms-error"
            className="mt-2 pl-7 text-[11px] font-semibold text-red-600"
          >
            {termsError}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1.5 h-11 w-full cursor-pointer rounded-xl bg-emerald-700 text-xs font-extrabold tracking-wider text-white uppercase shadow-md transition-all hover:bg-emerald-800 active:scale-[0.99]"
      >
        <UserPlus aria-hidden className="size-4" />
        {isSubmitting ? "Creating account…" : "Create Account"}
      </Button>

      <RegistrationTermsDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        onAccept={() => {
          setTermsAccepted(true);
          setTermsError(null);
          setTermsOpen(false);
        }}
      />
    </form>
  );
}
