import { Package } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard, KpiGrid } from "@/components/ui/Kpi";
import { StatusBadge } from "@/components/ui/badges/StatusBadge";
import { listItems } from "@/features/inventory/services/inventory.service";
import { listRequests } from "@/features/requests/services/request.service";
import { ReviewAsAdminButton } from "@/features/requests/components/ReviewAsAdminButton";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const statuses = ["pending", "approved", "fulfilled", "rejected"] as const;
  const [requests, inventory, lowStock, ...counts] = await Promise.all([
    listRequests({ pageSize: 5 }, viewer),
    listItems({ pageSize: 1 }),
    listItems({ stock: "low", pageSize: 1 }),
    ...statuses.map((status) => listRequests({ status, pageSize: 1 }, viewer)),
  ]);
  const labels = [
    "Pending requests",
    "Approved requests",
    "Issued requests",
    "Rejected requests",
  ];
  const notes = [
    "Awaiting a decision",
    "Approved, awaiting stock issuance",
    "Completed issuance",
    "Closed with a decision reason",
  ];
  return (
    <main className="page-scroll main-scroll-region route-page">
      <PageHeader
        title={
          viewer.role === "admin" ? "Operations Dashboard" : "Request Dashboard"
        }
        description="Request supplies, review decisions, and verify stock movements."
      />
      <section className="card demo-journey" aria-label="Demo walkthrough">
        <div className="actions">
          <Link className="button button-primary" href="/requests/new">
            Request supplies
          </Link>
          <ReviewAsAdminButton />
        </div>
        <p className="muted">
          Explore a scenario in your private demo workspace.
        </p>
        <nav className="demo-scenarios" aria-label="Demo scenarios">
          <Link
            className="button button-secondary button-compact"
            href="/requests?q=REQ-DEMO-1"
          >
            Ordinary fulfillment
          </Link>
          <Link
            className="button button-secondary button-compact"
            href="/requests?q=REQ-DEMO-2"
          >
            Shortage recovery
          </Link>
          <Link
            className="button button-secondary button-compact"
            href="/requests?q=Competing"
          >
            Competing requests
          </Link>
        </nav>
        <p className="demo-guidance">
          Try shortage recovery: approve the request, record two boxes of pens
          received, then issue the supplies and check their history.
        </p>
        <p className="demo-guidance">
          Stock changes when supplies are issued. Safety gloves show a separate
          example with two boxes held aside.
        </p>
      </section>
      <KpiGrid>
        {statuses.map((status, index) => (
          <KpiCard
            icon={<Package aria-hidden="true" />}
            key={status}
            tone={(["amber", "blue", "green", "red"] as const)[index]}
            label={labels[index]}
            value={counts[index].totalCount}
            note={notes[index]}
            footerHref={`/requests?status=${status}`}
            footerLabel="View requests"
          />
        ))}
      </KpiGrid>
      <KpiGrid>
        <KpiCard
          icon={<Package aria-hidden="true" />}
          label="Inventory items"
          value={inventory.totalCount}
          note="Distinct supplies in this workspace"
          footerHref="/inventory"
          footerLabel="View inventory"
        />
        <KpiCard
          icon={<Package aria-hidden="true" />}
          label="Low stock items"
          value={lowStock.totalCount}
          note="Available stock is positive and at or below the reorder point"
          footerHref="/inventory?stock=low"
          footerLabel="Review low stock"
        />
      </KpiGrid>
      <section className="card demo-recent-requests">
        <h3>Recent requests</h3>
        <p>
          Open a request to inspect its items, decision, stock availability, and
          history.
        </p>
        {requests.rows.length ? (
          <ul className="demo-request-list">
            {requests.rows.map((request) => (
              <li key={request.id}>
                <Link
                  className="demo-request-link"
                  href={`/requests/${request.id}`}
                >
                  <span className="demo-request-copy">
                    <strong>{request.requestCode}</strong>
                    <span>{request.reason}</span>
                  </span>
                  <StatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No requests yet. Request supplies to begin.</p>
        )}
      </section>
    </main>
  );
}
