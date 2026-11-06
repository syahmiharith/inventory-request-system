"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

const interactiveSelector =
  'a, button, input, select, textarea, form, [role="button"], [data-row-action]';

export function ClickableTableRow({
  children,
  className,
  href,
  selected = false,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  selected?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (
      sessionStorage.getItem("restore-row-focus") === "1" &&
      sessionStorage.getItem("selected-row-href") === href &&
      !pathname.match(/\/[a-f0-9-]{36}$/)
    ) {
      rowRef.current?.focus();
      sessionStorage.removeItem("restore-row-focus");
    }
  }, [href, pathname]);

  function shouldIgnoreNavigation(target: EventTarget | null) {
    return (
      target instanceof Element && Boolean(target.closest(interactiveSelector))
    );
  }

  function navigate() {
    sessionStorage.setItem("selected-row-href", href);
    router.push(href);
  }

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    if (!shouldIgnoreNavigation(event.target)) {
      navigate();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (shouldIgnoreNavigation(event.target)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  }

  return (
    <tr
      ref={rowRef}
      aria-current={selected ? "true" : undefined}
      className={`clickable-row ${selected ? "selected" : ""} ${className ?? ""}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {children}
    </tr>
  );
}
