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
      <section className="panel">
        <div className="actions">
          <Link className="button" href="/requests/new">
            Request supplies
          </Link>
          <ReviewAsAdminButton />
        </div>
        <p>Each scenario belongs to your private demo workspace.</p>
        <div className="actions">
          <Link href="/requests?q=REQ-DEMO-1">Ordinary fulfillment</Link>
          <Link href="/requests?q=REQ-DEMO-2">Shortage recovery</Link>
          <Link href="/requests?q=Competing">Competing requests</Link>
        </div>
        <p>
          For shortage recovery, review the request as admin, approve it, record
          two boxes of pens received, then issue all items and inspect history.
        </p>
        <p>
          Safety gloves include two boxes held aside for a separate safety
          exercise. Approval leaves stock available to other requests.
        </p>
      </section>
      <KpiGrid>
        {statuses.map((status, index) => (
          <KpiCard
            icon={<Package aria-hidden="true" />}
            key={status}
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
      <section className="panel">
        <h3>Recent requests</h3>
        <p>
          Open a request to inspect its items, decision, stock availability, and
          history.
        </p>
        {requests.rows.length ? (
          <ul>
            {requests.rows.map((request) => (
              <li key={request.id}>
                <Link href={`/requests/${request.id}`}>
                  {request.requestCode}
                </Link>{" "}
                <StatusBadge status={request.status} />{" "}
                <span>{request.reason}</span>
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
