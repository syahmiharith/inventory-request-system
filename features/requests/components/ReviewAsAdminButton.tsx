"use client";
import { useState } from "react";
export function ReviewAsAdminButton({ requestId }: { requestId?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function review() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/demo-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@inventory.local" }),
      });
      if (!response.ok)
        throw new Error("Unable to switch to demo admin. Please retry.");
      window.location.assign(
        requestId
          ? `/requests/${requestId}${window.location.search}`
          : "/requests",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to review requests.",
      );
      setPending(false);
    }
  }
  return (
    <div>
      <button
        className="button button-secondary"
        type="button"
        onClick={review}
        disabled={pending}
      >
        {pending
          ? "Opening review…"
          : requestId
            ? "Review this request as demo admin"
            : "Review requests"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
