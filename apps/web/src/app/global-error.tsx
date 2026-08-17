"use client";

/**
 * The root layout itself failed.
 *
 * This replaces the entire document, `<html>` and `<body>` included — which means
 * `globals.css` is **not loaded**, no design token resolves, and no font is
 * applied. Everything here is therefore inline styles and literal hex, which is
 * the one place in this codebase where that is correct: the alternative is a
 * blank white page.
 *
 * The hotline numbers are hardcoded for the same reason. Anything imported is
 * something that can fail to load, and NFR-AVL-004 puts hotline access above
 * every other consideration. If this page renders during a flood, it has to work
 * with nothing but the HTML it shipped with.
 *
 * Keep this file dependency-free. Adding an import is a regression even if it
 * works today.
 */

const HOTLINES = [
  { label: "National Emergency Hotline", number: "911", tel: "911" },
  { label: "Barangay San Jose", number: "0951-188-7878", tel: "+639511887878" },
  {
    label: "Rodriguez MDRRMO",
    number: "0915-001-6988 / 0969-614-4825",
    tel: "+639150016988",
  },
];

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#f8fafa",
          color: "#141a18",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
          <h1
            style={{
              fontSize: 24,
              lineHeight: "32px",
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 32px", color: "#4e5a55" }}>
            This page could not load. The emergency numbers below still work — tap one to
            call.
          </p>

          <h2
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6b7772",
              margin: "0 0 12px",
            }}
          >
            Emergency hotlines
          </h2>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {HOTLINES.map((hotline) => (
              <li key={hotline.number} style={{ marginBottom: 8 }}>
                <a
                  href={`tel:${hotline.tel}`}
                  style={{
                    display: "flex",
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid #e3e8e6",
                    backgroundColor: "#ffffff",
                    color: "#141a18",
                    textDecoration: "none",
                  }}
                >
                  <span>{hotline.label}</span>
                  <span style={{ fontWeight: 700, color: "#1f8049" }}>
                    {hotline.number}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p style={{ marginTop: 32 }}>
            {/* A raw anchor, not next/link, and the lint rule is wrong here: the
                root layout has crashed, so client-side routing is the thing that
                just failed. A full document navigation is the actual recovery. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#1f8049", fontWeight: 600 }}>
              Reload the site
            </a>
          </p>

          {error.digest ? (
            <p style={{ marginTop: 24, fontSize: 11, color: "#9aa5a1" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
