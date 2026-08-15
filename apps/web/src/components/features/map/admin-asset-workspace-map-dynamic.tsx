"use client";

import dynamic from "next/dynamic";
import type { AdminAssetWorkspaceMapProps } from "./admin-asset-workspace-map";

export const AdminAssetWorkspaceMap = dynamic<AdminAssetWorkspaceMapProps>(
  () =>
    import("./admin-asset-workspace-map").then(
      (mod) => mod.AdminAssetWorkspaceMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900 flex items-center justify-center text-xs font-semibold text-emerald-400">
        Loading GIS terrain & spatial assets…
      </div>
    ),
  },
);
