import { ReviewAsAdminButton } from "../ReviewAsAdminButton";
import { StockReceiptForm } from "../StockReceiptForm";
import { randomUUID } from "node:crypto";
import { RequestDetailHero } from "./RequestDetailHero";
import { RequestHistoryTimeline } from "./RequestHistoryTimeline";
import { RequestImpactList } from "./RequestImpactList";
import type { RequestDetail } from "./types";

export function RequestDetailPanel({
  isAdmin,
  query,
  request,
}: {
  isAdmin: boolean;
  query?: { error?: string; success?: string };
  request: NonNullable<RequestDetail>;
}) {
  const totalQuantity = request.items.reduce(
    (sum, item) => sum + item.requestedQuantity,
    0,
  );

  return (
    <div className="request-detail-sheet" data-testid="request-detail-panel">
      {query?.success ? (
        <p role="status" aria-live="polite" className="alert alert-success">
          {query.success}
        </p>
      ) : null}

      {query?.error ? (
        <p aria-live="polite" className="alert alert-error">
          {query.error}
        </p>
      ) : null}

      <RequestDetailHero request={request} totalQuantity={totalQuantity} />

      <section className="request-reason-card">
        <span>Reason</span>
        <p title={request.reason}>{request.reason}</p>
      </section>

      {request.status === "approved" ? (
        <p className="alert alert-info">
          Approval leaves stock available to other requests. Stock is deducted
          when items are issued.
        </p>
      ) : null}
      {!isAdmin ? <ReviewAsAdminButton requestId={request.id} /> : null}
      <RequestImpactList request={request} />
      {isAdmin && request.status === "approved" ? (
        <section className="detail-section">
          <div className="detail-section-header">
            <div>
              <h3>Record stock received</h3>
              <p>
                Record a delivery, then review availability before issuing this
                request.
              </p>
            </div>
          </div>
          <StockReceiptForm
            requestId={request.id}
            receiptKey={randomUUID()}
            items={request.items}
          />
        </section>
      ) : null}
      <RequestHistoryTimeline request={request} />
    </div>
  );
}
