"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, LogIn } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import type { ProblemDetail } from "@/lib/api/client";

/**
 * The staff sign-in form (FR-SYS-002). Lives here rather than in the page file
 * because it is the sanctioned place to compose `ui/` primitives directly
 * (`apps/web/AGENTS.md`: "Never import a raw `ui/` primitive into a page.").
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
          className="border-danger-border bg-danger-bg text-danger flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
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
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-danger text-xs">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        <LogIn aria-hidden className="size-4" />
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
