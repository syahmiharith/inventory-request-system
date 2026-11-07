"use client";
export function DemoUnavailable({
  reason = "unavailable",
  startNewSession = false,
}: {
  reason?: "busy" | "unavailable";
  startNewSession?: boolean;
}) {
  return (
    <main className="page-state demo-unavailable" role="alert">
      <section className="card">
        <p className="muted">Inventory Request System</p>
        <h1>
          {reason === "busy"
            ? "Demo activity limit reached"
            : "Demo temporarily unavailable"}
        </h1>
        <p>
          {reason === "busy"
            ? "The demo has reached its activity limit. Please try again later."
            : "Your workspace could not be loaded. Please try again."}
        </p>
        <button
          className="button button-secondary"
          type="button"
          onClick={() =>
            startNewSession
              ? window.location.assign("/api/demo/start")
              : window.location.reload()
          }
        >
          Try again
        </button>
      </section>
    </main>
  );
}
