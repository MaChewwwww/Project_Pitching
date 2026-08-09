/**
 * Public route group page transition (NFR-UX-007 — prefers-reduced-motion honoured).
 *
 * Unlike `layout.tsx`, Next.js creates a NEW instance of `template.tsx` on every
 * navigation. That means the CSS entry animation on `.page-enter` fires naturally
 * every time the route changes — no client component, no JavaScript, no external
 * dependency.
 *
 * The animation itself lives in `globals.css` so it shares the same
 * `prefers-reduced-motion` gate and `@keyframes` naming convention as `reveal-in`.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
