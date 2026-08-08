"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, UserPlus } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import type { ProblemDetail } from "@/lib/api/client";

/**
 * FR-SYS-001 — account basics only. Mirrors `login-form.tsx`'s structure, but
 * additionally maps field-level errors from the RFC 7807 `errors[]` array
 * (`AdminForm`'s pattern) so a 409 "email taken" lands on the email input
 * rather than a generic banner.
 */

const registerSchema = z
  .object({
    full_name: z.string().min(1, "Enter your full name"),
    email: z.string().min(1, "Enter your email address").email("Enter a valid email address"),
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
        setError(fieldError.field as keyof RegisterFormValues, { message: fieldError.message });
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-[20px] border border-neutral-200 bg-white p-6 shadow-sm"
    >
      {serverError ? (
        <div
          role="alert"
          className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
          {...registerField("full_name")}
        />
        {errors.full_name ? (
          <p id="full_name-error" className="text-danger text-xs">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...registerField("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-danger text-xs">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...registerField("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-danger text-xs">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          {...registerField("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p id="confirmPassword-error" className="text-danger text-xs">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        <UserPlus aria-hidden className="size-4" />
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
