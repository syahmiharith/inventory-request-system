"use client";
import { useEffect, useRef, useState } from "react";
import { LifeBuoy, UserRound } from "lucide-react";
import Link from "next/link";
import type { User } from "@/db/schema";
import { DemoUserSwitcher } from "@/components/ui/DemoUserSwitcher";
import { DemoWorkspaceControls } from "@/components/ui/DemoWorkspaceControls";
export function AccountMenu({
  currentUser,
  demoUsers,
}: {
  currentUser: User;
  demoUsers: User[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: Event) {
      const target = event.target as Element;
      if (
        !root.current?.contains(target) &&
        !target.closest('[role="listbox"]')
      )
        setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="account-menu" ref={root}>
      <button
        ref={trigger}
        className="account-avatar"
        type="button"
        aria-label={`Open account menu for ${currentUser.name}`}
        aria-expanded={open}
        aria-controls={open ? "account-panel" : undefined}
        onClick={() => setOpen(!open)}
      >
        <span data-testid="profile-summary">
          {currentUser.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
          <span className="sr-only">
            {currentUser.role === "admin" ? "Admin" : "Employee"}
          </span>
        </span>
      </button>
      {open && (
        <div
          className="account-panel"
          id="account-panel"
          role="dialog"
          aria-label="Account menu"
        >
          <div className="account-identity">
            <UserRound size={18} aria-hidden="true" />
            <div>
              <strong>{currentUser.name}</strong>
              <span>
                {currentUser.role === "admin"
                  ? "Demo administrator"
                  : "Demo employee"}
              </span>
            </div>
          </div>
          <div className="account-group">
            <span className="account-group-label">Demo role</span>
            <DemoUserSwitcher
              initialUsers={demoUsers}
              initialCurrentUser={currentUser}
            />
          </div>
          <div className="account-group">
            <span className="account-group-label">
              Workspace · expires after 24 hours
            </span>
            <DemoWorkspaceControls />
          </div>
          <Link
            href="/support"
            className="account-support"
            onClick={() => setOpen(false)}
          >
            <LifeBuoy size={16} aria-hidden="true" />
            Report a problem
          </Link>
        </div>
      )}
    </div>
  );
}
