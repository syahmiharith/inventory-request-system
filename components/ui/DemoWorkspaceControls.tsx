"use client";
import { useState } from "react";
export function DemoWorkspaceControls() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    if (!window.confirm("Reset your demo workspace and start again?")) return;
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
      <span>Demo workspace · 24-hour session</span>
      <button
        className="button button-secondary button-compact"
        disabled={pending}
        onClick={reset}
      >
        {pending ? "Resetting…" : "Reset my demo"}
      </button>
      {error ? (
        <p className="form-message error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
