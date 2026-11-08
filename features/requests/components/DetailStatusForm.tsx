"use client";

import { useState, type FormEvent } from "react";
import { ActionDialog } from "@/components/ui/modal/ActionDialog";
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
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || pending) return;
    const adminComment = status === "rejected" ? reason.trim() : undefined;
    if (status === "rejected" && !adminComment) {
      setError("A rejection reason is required.");
      return;
    }
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
      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.delete("error");
      url.searchParams.set(
        "success",
        `Request ${status === "fulfilled" ? "issued" : status} successfully.`,
      );
      window.location.assign(url.toString());
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
    <>
      <button
        type="button"
        className={`button button-${status === "rejected" ? variant : "primary"}`}
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
      >
        {pending ? "Updating…" : label}
      </button>
      {confirming && (
        <ActionDialog
          title={`${label} request?`}
          busy={pending}
          onClose={() => setConfirming(false)}
        >
          <p>
            {status === "approved"
              ? "Approval leaves stock available. Supplies are deducted only when issued."
              : status === "fulfilled"
                ? "Issuing deducts these supplies from available stock. This request can only be issued once."
                : "The requester will see your reason. Stock will not change."}
          </p>
          {fulfillPreview && (
            <pre className="issuance-preview">{fulfillPreview}</pre>
          )}
          <form noValidate onSubmit={submit}>
            {status === "rejected" && (
              <label className="field">
                Reason for rejection
                <textarea
                  autoFocus
                  className="input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  maxLength={500}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="form-message error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className={`button button-${status === "rejected" ? "danger" : "primary"}`}
                type="submit"
                disabled={pending}
              >
                {pending ? "Updating…" : `Confirm ${label.toLowerCase()}`}
              </button>
            </div>
          </form>
        </ActionDialog>
      )}
    </>
  );
}
