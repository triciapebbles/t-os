"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Weekly Schedule" },
  { href: "/chores", label: "Chores" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="border-b border-brand-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-brand-800">🏠 House Management</span>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 py-1 rounded-md transition-colors ${
                  pathname === link.href
                    ? "bg-brand-100 text-brand-800 font-medium"
                    : "text-brand-600 hover:bg-brand-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-brand-700">
          <span>{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-3 py-1 rounded-md border border-brand-300 hover:bg-brand-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
