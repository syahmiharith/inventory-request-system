"use client";

import { AccountMenu } from "./AccountMenu";
import type { User } from "@/db/schema";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader({
  currentUser,
  demoUsers,
}: {
  currentUser: User;
  demoUsers: User[];
}) {
  const pathname = usePathname();
  return (
    <header className="app-header" data-testid="app-header">
      <div className="header-title header-workspace">
        <span className="workspace-dot" />
        Private demo<span className="header-lifetime">24-hour workspace</span>
      </div>
      <div className="header-actions">
        <AccountMenu currentUser={currentUser} demoUsers={demoUsers} />
      </div>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        {[
          { href: "/", label: "Dashboard" },
          { href: "/inventory", label: "Inventory" },
          { href: "/requests", label: "Requests" },
          { href: "/support", label: "Help" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (
                href === "/"
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname.startsWith(href)
              )
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
