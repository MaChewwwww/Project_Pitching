"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { useRequireRole } from "@/lib/auth/use-require-role";

export default function EditEvacuationCenterPage() {
  useRequireRole("admin");
  const params = useParams();
  const router = useRouter();
  const centerId = params.id as string;

  React.useEffect(() => {
    if (centerId) {
      router.replace(`/admin/evacuation-centers/${centerId}`);
    } else {
      router.replace("/admin/evacuation-centers");
    }
  }, [router, centerId]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-emerald-100 p-4 text-emerald-800">
        <Building2 className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">
        Shelter Editor Moved to Modal
      </h2>
      <p className="text-xs text-slate-500 max-w-sm">
        Evacuation center specifications are now updated directly via modal dialogs.
      </p>
      <Link href={centerId ? `/admin/evacuation-centers/${centerId}` : "/admin/evacuation-centers"}>
        <Button variant="primary" size="sm" className="h-9 gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white">
          <ArrowLeft className="size-3.5" />
          Go to Shelter Details
        </Button>
      </Link>
    </div>
  );
}
