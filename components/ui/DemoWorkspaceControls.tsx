"use client";
import { useState } from "react";
import { ActionDialog } from "./modal/ActionDialog";
export function DemoWorkspaceControls() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  async function reset() {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Unable to reset. Please retry.");
      window.location.assign("/api/demo/start");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset.");
      setPending(false);
    }
  }
  return (
    <section className="demo-workspace-bar" aria-label="Demo workspace">
      <span>Private workspace · 24 hours</span>
      <button
        className="button button-quiet button-compact"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        {pending ? "Resetting…" : "Reset my demo"}
      </button>
      {confirming && (
        <ActionDialog
          title="Reset this workspace?"
          busy={pending}
          onClose={() => setConfirming(false)}
        >
          <p>
            Your demo requests and stock changes will be replaced with the
            starting supplies and examples.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              className="button button-danger"
              disabled={pending}
              onClick={reset}
            >
              {pending ? "Resetting…" : "Reset my demo"}
            </button>
          </div>
        </ActionDialog>
      )}
      {error && !confirming ? (
        <p className="form-message error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
