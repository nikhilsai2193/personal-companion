"use client";

// Lenis smooth scrolling broke native scroll in real-world testing (editor,
// then archive) — every page uses native scroll instead. If inertia scroll is
// reintroduced for the landing page (M7): import lenis's stylesheet, force a
// re-measure after async content loads, and verify on a real trackpad first.
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
