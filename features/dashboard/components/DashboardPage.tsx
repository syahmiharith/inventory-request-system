import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/badges/StatusBadge";
import { listItems } from "@/features/inventory/services/inventory.service";
import { listRequests } from "@/features/requests/services/request.service";
import { ReviewAsAdminButton } from "@/features/requests/components/ReviewAsAdminButton";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const statuses = ["pending", "approved", "fulfilled"] as const;
  const [requests, lowStock, approved, ...counts] = await Promise.all([
    listRequests({ pageSize: 5 }, viewer),
    listItems({ stock: "low", pageSize: 5 }),
    listRequests({ status: "approved", pageSize: 25 }, viewer),
    ...statuses.map((status) => listRequests({ status, pageSize: 1 }, viewer)),
  ]);
  const shortages = approved.rows.filter((request) =>
    request.items.some(
      (item) => item.availableQuantity < item.requestedQuantity,
    ),
  );
  return (
    <main className="page-scroll main-scroll-region route-page operations-dashboard">
      <PageHeader
        title="Dashboard"
        description={
          viewer.role === "admin"
            ? "Your requests and stock, at a glance."
            : "Your supplies, from request to collection."
        }
        actions={
          <Link className="button button-primary" href="/requests/new">
            Request supplies
          </Link>
        }
      />
      <nav className="operations-counts" aria-label="Request summaries">
        {statuses.map((status, index) => (
          <Link href={`/requests?status=${status}`} key={status}>
            <strong>{counts[index].totalCount}</strong>
            <span>{["Awaiting review", "Approved", "Issued"][index]}</span>
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        ))}
      </nav>
      {shortages.length > 0 && (
        <section
          className="operations-section"
          aria-labelledby="attention-title"
        >
          <h2 id="attention-title">Needs attention</h2>
          <div className="attention-list">
            {shortages.slice(0, 3).map((request) => (
              <Link
                className="attention-row"
                key={request.id}
                href={`/requests/${request.id}`}
              >
                <AlertCircle aria-hidden="true" size={20} />
                <span>
                  <strong>{request.requestCode}</strong>
                  <span>
                    {request.items
                      .filter(
                        (item) =>
                          item.availableQuantity < item.requestedQuantity,
                      )
                      .map(
                        (item) =>
                          `${item.itemName}: ${item.requestedQuantity - item.availableQuantity} ${item.unit} short`,
                      )
                      .join(" · ")}
                  </span>
                </span>
                <span className="attention-action">
                  Resolve stock <ArrowRight aria-hidden="true" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="operations-section" aria-labelledby="queue-title">
        <div className="section-heading">
          <h2 id="queue-title">Recent requests</h2>
          <Link href="/requests">
            View all requests <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        {requests.rows.length ? (
          <div className="table-wrap">
            <table className="dashboard-queue">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.rows.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link
                        className="record-link"
                        href={`/requests/${request.id}`}
                      >
                        {request.requestCode}
                      </Link>
                      <span className="cell-subtext">{request.reason}</span>
                    </td>
                    <td>
                      {request.items.length}{" "}
                      {request.items.length === 1 ? "item" : "items"}
                    </td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>
                      <Link
                        className="record-link"
                        href={`/requests/${request.id}`}
                        aria-label={`Open ${request.requestCode}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">
            No requests yet. Request supplies to begin.
          </p>
        )}
      </section>
      <section className="operations-section" aria-labelledby="stock-title">
        <div className="section-heading">
          <h2 id="stock-title">Stock to watch</h2>
          <Link href="/inventory?stock=low">
            View inventory <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        {lowStock.rows.length ? (
          lowStock.rows.map((item) => (
            <Link
              className="stock-watch-row"
              key={item.id}
              href={`/inventory/${item.id}`}
            >
              <strong>{item.name}</strong>
              <span>
                {item.available} {item.unit} available
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <p className="muted">No low-stock supplies.</p>
        )}
      </section>
      <details className="walkthrough-disclosure">
        <summary>Try a guided scenario</summary>
        <div className="demo-scenarios">
          <Link href="/requests?q=REQ-DEMO-1">Ordinary fulfillment</Link>
          <Link href="/requests?q=REQ-DEMO-2">Shortage recovery</Link>
          <Link href="/requests?q=Competing">Competing requests</Link>
        </div>
        <p>
          Approve a request, record any missing stock, then issue the supplies.
          Approval does not deduct stock.
        </p>
        <ReviewAsAdminButton />
      </details>
    </main>
  );
}
