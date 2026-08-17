"use client";

import dynamic from "next/dynamic";
import { MapWorkspaceSkeleton } from "@/components/common/portal-loading";
import type { AdminAssetWorkspaceMapProps } from "./admin-asset-workspace-map";

export const AdminAssetWorkspaceMap = dynamic<AdminAssetWorkspaceMapProps>(
  () => import("./admin-asset-workspace-map").then((mod) => mod.AdminAssetWorkspaceMap),
  {
    ssr: false,
    loading: () => (
      <MapWorkspaceSkeleton
        label="Loading GIS terrain and spatial assets"
        className="h-full"
      />
    ),
  },
);
