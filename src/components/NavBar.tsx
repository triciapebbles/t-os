"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Weekly schedule" },
  { href: "/chores", label: "Chores" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="bg-brand-50">
      <div className="mx-auto max-w-5xl px-4 pt-5 flex items-center justify-between flex-wrap gap-3">
        <nav className="flex items-end gap-2">
          <span className="mono text-xs tracking-wide uppercase text-brand-500 pb-2 pr-2">
            🏠 House Management
          </span>
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mono text-[13px] rounded-b-[9px] px-4 pt-2.5 pb-2 transition-colors ${
                  active
                    ? "bg-[#E4EAC6] text-[#5B6B2E]"
                    :
