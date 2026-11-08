import type { RequestStatus } from "@/lib/constants";
import { DetailStatusForm } from "../DetailStatusForm";
import type { RequestDetail } from "./types";

export function RequestDetailFooter({
  isAdmin,
  request,
}: {
  isAdmin: boolean;
  request: NonNullable<RequestDetail>;
}) {
  if (!isAdmin) {
    return <p className="muted">Only admins can update request status.</p>;
  }

  const canFulfill =
    request.status === "approved" &&
    request.items.every(
      (item) => item.availableQuantity >= item.requestedQuantity,
    );
  const fulfillPreview = request.items
    .map(
      (item) =>
        `${item.itemName}: ${item.availableQuantity} -> ${
          item.availableQuantity - item.requestedQuantity
        }`,
    )
    .join("\n");

  return (
    <div className="request-action-footer">
      <AdminActions
        canFulfill={canFulfill}
        fulfillPreview={fulfillPreview}
        requestId={request.id}
        status={request.status}
      />
      {request.status === "approved" && !canFulfill ? (
        <p className="action-footer-note">
          {request.items
            .filter((item) => item.availableQuantity < item.requestedQuantity)
            .map(
              (item) =>
                `${item.itemName}: ${item.requestedQuantity - item.availableQuantity} ${item.unit} short`,
            )
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function AdminActions({
  canFulfill,
  fulfillPreview,
  requestId,
  status,
}: {
  canFulfill: boolean;
  fulfillPreview: string;
  requestId: string;
  status: RequestStatus;
}) {
  if (status === "pending") {
    return (
      <div className="request-action-buttons">
        <DetailStatusForm
          requestId={requestId}
          status="approved"
          label="Approve"
        />
        <DetailStatusForm
          requestId={requestId}
          status="rejected"
          label="Reject"
          variant="danger"
        />
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="request-action-buttons">
        {!canFulfill && (
          <a className="button button-primary" href="#record-stock">
            Record stock received
          </a>
        )}
        <DetailStatusForm
          disabled={!canFulfill}
          disabledReason="Insufficient stock for issuance."
          fulfillPreview={fulfillPreview}
          requestId={requestId}
          status="fulfilled"
          label="Issue"
        />
      </div>
    );
  }

  return <p className="empty-state">No actions available for this status.</p>;
}
