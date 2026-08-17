"use client";

import dynamic from "next/dynamic";
import { MapWorkspaceSkeleton } from "@/components/common/portal-loading";

export const AdminAssetMap = dynamic(
  () => import("./admin-asset-map").then((module) => module.AdminAssetMap),
  {
    ssr: false,
    loading: () => <MapWorkspaceSkeleton label="Loading asset map" className="h-full" />,
  },
);
