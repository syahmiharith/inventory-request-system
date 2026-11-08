"use client";

import { useId, useState } from "react";
import {
  ArrowUpRight,
  Code2,
  MessageSquare,
  ShieldCheck,
  Plus,
  Minus,
} from "lucide-react";

export function ProductFooter() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <footer className="product-footer">
      <div className="product-footer-row">
        <p>
          Built by <strong>Zulsyahmi Zulkefli</strong>
        </p>
        <nav aria-label="Project links">
          <a
            href="https://portfolio-syahmiharith.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowUpRight aria-hidden="true" />
            More work<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a
            href="https://github.com/syahmiharith/inventory-request-system"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code2 aria-hidden="true" />
            Source code<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href="/support">
            <MessageSquare aria-hidden="true" />
            Report a problem
            <span className="sr-only"> Open the problem report form</span>
          </a>
        </nav>
      </div>
      <div className="privacy-disclosure">
        <button
          className="privacy-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <ShieldCheck aria-hidden="true" />
          <span>Privacy &amp; storage</span>
          {open ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
        </button>
        <p id={panelId} hidden={!open} className="privacy-copy">
          This demo stores requests and stock changes in a private workspace for
          24 hours. A browser cookie keeps you connected to it. Expired
          workspaces are removed during cleanup. Reset my demo starts a fresh
          workspace. Use sample information only; feedback submitted on GitHub
          is public.
        </p>
      </div>
    </footer>
  );
}
