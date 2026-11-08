"use client";

import { Dropdown } from "@/components/ui/forms/Dropdown";

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
      url.hash = "";
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
    <form onSubmit={submit} aria-busy={pending}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="key" value={key} />
      <fieldset disabled={pending} className="form-grid receipt-fields">
        <legend className="sr-only">Delivery details</legend>
        <div className="field">
          <label htmlFor={`receipt-item-${requestId}`}>Item</label>
          <Dropdown
            label="Item"
            id={`receipt-item-${requestId}`}
            name="itemId"
            required
            disabled={pending}
            defaultValue={items[0]?.itemId ?? ""}
            options={items.map((item) => ({
              value: item.itemId,
              label: item.itemName,
            }))}
          />
        </div>
        <label className="field">
          Quantity received
          <input
            className="input"
            name="quantity"
            type="number"
            min="1"
            max="1000000"
            step="1"
            required
          />
        </label>
        <label className="field">
          Delivery reference or reason
          <input
            className="input"
            name="reason"
            maxLength={500}
            required
            aria-describedby={`receipt-reference-hint-${requestId}`}
          />
          <span
            className="field-hint"
            id={`receipt-reference-hint-${requestId}`}
          >
            Use a delivery note number or a brief reason for the receipt.
          </span>
        </label>
        <button type="submit" className="button button-primary">
          {pending ? "Recording delivery…" : "Record stock received"}
        </button>
      </fieldset>
      {result ? (
        <p
          className={`alert ${result.ok ? "alert-success" : "alert-error"}`}
          role={result.ok ? "status" : "alert"}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
