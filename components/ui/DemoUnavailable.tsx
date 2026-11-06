"use client";
export function DemoUnavailable() {
  return (
    <main className="page-state" role="alert">
      <h1>Demo temporarily unavailable</h1>
      <p>Your workspace could not be loaded. Please try again.</p>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </main>
  );
}
