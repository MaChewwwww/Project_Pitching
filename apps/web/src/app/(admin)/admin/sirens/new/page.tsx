"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function NewSirenRedirectPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/admin/sirens");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-slate-500 animate-pulse">
      Redirecting to Siren Alert Network…
    </div>
  );
}
