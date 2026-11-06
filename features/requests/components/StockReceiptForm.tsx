"use client";

import { useState, type FormEvent } from "react";

export function StockReceiptForm({
  requestId,
  receiptKey,
  items,
}: {
  requestId: string;
  receiptKey: string;
  items: { itemId: string; itemName: string }[];
}) {
  const [key] = useState(receiptKey);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const input = new FormData(form);
    setPending(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(input)),
      });
      const outcome = await response.json();
      if (!response.ok) {
        setResult({
          ok: false,
          message: outcome.error ?? "Unable to record delivery. Please retry.",
        });
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set(
        "success",
        "Stock received. Review availability and issue the request.",
      );
      window.location.assign(url.toString());
    } catch {
      setResult({
        ok: false,
        message:
          "Unable to confirm delivery. Retry with the same values to safely check and record it.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="key" value={key} />
      <fieldset disabled={pending} className="form-grid">
        <legend>Delivery details</legend>
        <label htmlFor={`receipt-item-${requestId}`}>Item</label>
        <select id={`receipt-item-${requestId}`} name="itemId" required>
          {items.map((item) => (
            <option key={item.itemId} value={item.itemId}>
              {item.itemName}
            </option>
          ))}
        </select>
        <label>
          Quantity received
          <input
            name="quantity"
            type="number"
            min="1"
            max="1000000"
            step="1"
            required
          />
        </label>
        <label>
          Delivery reference or reason
          <input name="reason" maxLength={500} required />
        </label>
        <button type="submit" className="button">
          {pending ? "Recording delivery…" : "Record stock received"}
        </button>
      </fieldset>
      {result ? (
        <p role={result.ok ? "status" : "alert"}>{result.message}</p>
      ) : null}
    </form>
  );
}
