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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/assets/San Jose Logo.jpg",
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
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
