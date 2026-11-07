"use client";

import type { User } from "@/db/schema";
import { DemoUserSwitcher } from "@/components/ui/DemoUserSwitcher";
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
      <div className="header-title">
        <div>
          <span className="breadcrumb">Internal Inventory Operations</span>
          <h1>Inventory Request System</h1>
        </div>
      </div>

      <div className="header-actions">
        <DemoUserSwitcher
          initialUsers={demoUsers}
          initialCurrentUser={currentUser}
        />
        <div className="viewer-chip" data-testid="profile-summary">
          <strong>{initials(currentUser.name)}</strong>
          <span>{currentUser.role === "admin" ? "Admin" : "Employee"}</span>
        </div>
      </div>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        {[
          { href: "/", label: "Dashboard" },
          { href: "/inventory", label: "Inventory" },
          { href: "/requests", label: "Requests" },
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
