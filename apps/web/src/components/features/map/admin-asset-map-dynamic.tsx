"use client";

import dynamic from "next/dynamic";

export const AdminAssetMap = dynamic(
  () => import("./admin-asset-map").then((module) => module.AdminAssetMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-80 animate-pulse rounded-2xl bg-slate-950" />
    ),
  },
);
