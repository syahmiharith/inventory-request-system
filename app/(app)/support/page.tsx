"use client";
import { useState } from "react";
import { LifeBuoy, ArrowUpRight } from "lucide-react";
import { ProductFooter } from "@/components/layout/ProductFooter";
export default function SupportPage() {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  return (
    <main className="page-scroll main-scroll-region route-page support-page">
      <header className="route-heading">
        <div>
          <h1>Report a problem</h1>
          <p>Tell us where the demo got in your way.</p>
        </div>
        <LifeBuoy aria-hidden="true" />
      </header>
      <form
        noValidate
        className="support-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || !details.trim()) {
            setError("Add a short title and describe what happened.");
            setDraft("");
            return;
          }
          setError("");
          setDraft(
            "https://github.com/syahmiharith/inventory-request-system/issues/new?" +
              new URLSearchParams({
                title: title.trim(),
                body: `What happened?\n${details.trim()}\n\nWhat did you expect?\n${expected.trim()}\n\nPlease use synthetic examples only.`,
              }),
          );
        }}
      >
        <p className="support-note">
          Reports are public on GitHub. Use sample information and leave out
          personal details, passwords, and real inventory records.
        </p>
        <label className="field">
          Short title
          <input
            className="input"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDraft("");
            }}
            maxLength={140}
            required
            placeholder="What needs fixing?"
          />
        </label>
        <label className="field">
          What happened?
          <textarea
            className="input textarea"
            value={details}
            onChange={(e) => {
              setDetails(e.target.value);
              setDraft("");
            }}
            maxLength={3000}
            rows={5}
            required
            placeholder="Which tab were you on, and what were you trying to do?"
          />
        </label>
        <label className="field">
          What did you expect? <span className="field-hint">Optional</span>
          <textarea
            className="input textarea"
            value={expected}
            onChange={(e) => {
              setExpected(e.target.value);
              setDraft("");
            }}
            maxLength={2000}
            rows={3}
          />
        </label>
        {error && (
          <p role="alert" className="form-message error">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit">
          Prepare report
        </button>
        {draft && (
          <div className="report-ready" role="status">
            <strong>Your draft is ready</strong>
            <p>
              Review and submit it on GitHub. A GitHub account is required.
              Nothing has been sent yet.
            </p>
            <a
              className="button button-secondary"
              href={draft}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub draft <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        )}
      </form>
      <ProductFooter />
    </main>
  );
}
