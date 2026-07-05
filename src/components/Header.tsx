"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/plan", label: "plan" },
  { href: "/archive", label: "archive" },
  { href: "/record", label: "record" },
  { href: "/editor", label: "edit" },
  { href: "/friends", label: "friends" },
];

export default function Header({
  user,
  signOutAction,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-ink-3 bg-ink/80 px-6 py-4 backdrop-blur-sm md:px-10">
      <Link
        href="/"
        className="font-display text-sm tracking-[0.18em] text-bone"
      >
        DAYFILM
      </Link>
      {user ? (
        <div className="flex items-center gap-6 md:gap-8">
          <nav className="flex gap-6 text-xs tracking-[0.12em] md:gap-8">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname.startsWith(href)
                    ? "text-bone"
                    : "text-bone-muted transition-colors duration-300 hover:text-bone"
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <form action={signOutAction} className="flex items-center gap-3">
            <span
              title={user.email ?? undefined}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-3 text-[10px] tracking-widest text-bone"
            >
              {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <button className="text-[10px] tracking-[0.14em] text-bone-faint transition-colors duration-300 hover:text-bone">
              sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <ThemeToggle />
          {pathname !== "/login" && (
            <Link
              href="/login"
              className="text-xs tracking-[0.12em] text-bone-muted transition-colors duration-300 hover:text-bone"
            >
              sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
