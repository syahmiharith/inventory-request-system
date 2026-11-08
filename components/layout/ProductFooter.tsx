import { ArrowUpRight, Code2, MessageSquare } from "lucide-react";

const feedbackUrl =
  "https://github.com/syahmiharith/inventory-request-system/issues/new?" +
  new URLSearchParams({
    title: "Inventory Request System feedback",
    body: "Please use synthetic examples. Do not include personal information or real inventory records.\n\nWhat were you trying to do?\n\nWhat happened?\n\nWhat did you expect?\n\nDevice and browser (optional):\n",
  }).toString();

export function ProductFooter() {
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
          <a href={feedbackUrl} target="_blank" rel="noopener noreferrer">
            <MessageSquare aria-hidden="true" />
            Report a problem
            <span className="sr-only"> on GitHub (opens in a new tab)</span>
          </a>
        </nav>
      </div>
      <details>
        <summary>Privacy &amp; storage</summary>
        <p>
          This demo stores requests and stock changes in a private workspace for
          24 hours. A browser cookie keeps you connected to it. Expired
          workspaces are removed during cleanup. Reset my demo starts a fresh
          workspace. Use sample information only; feedback submitted on GitHub
          is public.
        </p>
      </details>
    </footer>
  );
}
