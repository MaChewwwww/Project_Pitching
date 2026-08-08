import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/app/providers";
import { APP_NAME, BARANGAY } from "@/lib/brand";
import "./globals.css";

/**
 * Three families, latin subset, `display: swap` (design.md Section 4). Two
 * families is the performance budget; the mono is scoped to reference numbers
 * and coordinates, where character disambiguation actually matters.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Disaster Readiness & Community Health`,
    template: `%s · ${APP_NAME}`,
  },
  description: `Disaster readiness and community health platform for ${BARANGAY}.`,
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
      className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
