"use client";

import { useState, type FormEvent } from "react";
import type { RequestStatus } from "@/lib/constants";

export function DetailStatusForm({
  requestId,
  status,
  label,
  disabled = false,
  disabledReason,
  fulfillPreview,
  variant = "secondary",
}: {
  requestId: string;
  status: RequestStatus;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  fulfillPreview?: string;
  variant?: "secondary" | "danger";
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    let adminComment: string | undefined;
    if (status === "rejected") {
      const note = window.prompt("Reason for rejection", "");
      if (note === null) return;
      adminComment = note.trim();
      if (!adminComment) {
        setError("A rejection reason is required.");
        return;
      }
    } else if (
      !window.confirm(
        `Confirm ${label.toLowerCase()}?${fulfillPreview ? `\n\n${fulfillPreview}` : ""}`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminComment, key }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Unable to update request.");
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to confirm update. Refresh the request before retrying.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <button
        type="submit"
        className={`button button-${variant}`}
        disabled={disabled || pending}
        title={disabledReason}
      >
        {pending ? "Updating…" : label}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
