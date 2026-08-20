import type { Metadata, Viewport } from "next";

import { Providers } from "@/app/providers";
import { APP_NAME, BARANGAY } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Disaster Readiness & Community Health`,
    template: `${APP_NAME} | %s`,
  },
  description: `Disaster readiness and community health platform for ${BARANGAY}.`,
  icons: {
    icon: [{ url: "/logo-transparent.png", type: "image/png", sizes: "2000x2000" }],
    shortcut: "/logo-transparent.png",
    apple: [{ url: "/logo-transparent.png", type: "image/png", sizes: "2000x2000" }],
  },
};

export const viewport: Viewport = {
  // No maximum-scale and no user-scalable=no: the page must stay usable at 200%
  // zoom (design.md Section 10).
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C2A19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full max-w-full overflow-x-clip antialiased"
    >
      <body className="bg-background flex min-h-full max-w-full flex-col overflow-x-clip text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
