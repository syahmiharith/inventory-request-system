import { ProductFooter } from "@/components/layout/ProductFooter";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/badges/StatusBadge";
import { listItems } from "@/features/inventory/services/inventory.service";
import { listRequests } from "@/features/requests/services/request.service";
import { ReviewAsAdminButton } from "@/features/requests/components/ReviewAsAdminButton";
import {
  getDashboardRequestKpis,
  getDashboardInventoryKpis,
  getIssuanceActivity,
} from "@/features/dashboard/services/dashboard.service";

export default async function HomePage() {
  const viewer = await getCurrentUser();
  const [metrics, stock, activity, pending, approved, risks] =
    await Promise.all([
      getDashboardRequestKpis(viewer),
      getDashboardInventoryKpis(viewer),
      getIssuanceActivity(viewer),
      listRequests(
        { status: "pending", sort: "requiredBy", dir: "asc", pageSize: 5 },
        viewer,
      ),
      listRequests(
        { status: "approved", sort: "requiredBy", dir: "asc", pageSize: 5 },
        viewer,
      ),
      listItems({ lowStock: true, sort: "available", dir: "asc", pageSize: 5 }),
    ]);
  const open = metrics.pendingRequests + metrics.approvedRequests;
  const ready = metrics.approvedRequests - metrics.blockedFulfillment;
  const out = stock.totalItems - stock.availableItems;
  const low = stock.lowStockItems - out;
  const healthy = stock.totalItems - stock.lowStockItems;
  const queue = [...pending.rows, ...approved.rows]
    .sort(
      (a, b) =>
        a.requiredBy.localeCompare(b.requiredBy) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .slice(0, 5);
  const issued = activity.reduce((sum, day) => sum + day.count, 0);
  const peak = Math.max(1, ...activity.map((day) => day.count));
  const segments = [
    {
      label: "Awaiting review",
      count: metrics.pendingRequests,
      color: "#c49b43",
    },
    { label: "Ready to issue", count: ready, color: "#577960" },
    {
      label: "Blocked by stock",
      count: metrics.blockedFulfillment,
      color: "#bd6655",
    },
  ];
  const healthyAngle = stock.totalItems
    ? (healthy / stock.totalItems) * 360
    : 0;
  const lowAngle = stock.totalItems
    ? ((healthy + low) / stock.totalItems) * 360
    : 0;
  return (
    <main className="page-scroll main-scroll-region route-page operations-dashboard graphical-dashboard">
      <PageHeader
        title="Dashboard"
        description={
          viewer.role === "admin"
            ? "See what needs attention. Keep supplies moving."
            : "Your requests, availability, and recent progress."
        }
        actions={
          <Link className="button button-primary" href="/requests/new">
            Request supplies
          </Link>
        }
      />
      <div className="dashboard-context">
        <span>Workspace overview</span>
        <span>Live stock · Activity in UTC</span>
      </div>
      {metrics.overSla > 0 && (
        <a className="dashboard-overdue" href="#work-queue">
          <AlertCircle size={18} aria-hidden="true" />
          <strong>
            {metrics.overSla} overdue{" "}
            {metrics.overSla === 1 ? "request" : "requests"}
          </strong>
          <span>Review the earliest deadlines below</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      )}
      <div className="dashboard-chart-grid">
        <section
          className="metric-panel workload-panel"
          aria-labelledby="workload-title"
        >
          <div className="section-heading">
            <h2 id="workload-title">
              {viewer.role === "admin" ? "Open requests" : "Your open requests"}
            </h2>
            <Link href="/requests" aria-label="View all requests">
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="metric-headline">
            <strong>{open}</strong>
            <span>awaiting review or issuance</span>
          </div>
          <div className="workload-bar" aria-hidden="true">
            {segments.map((segment) => (
              <span
                key={segment.label}
                style={{
                  width: `${open ? (segment.count / open) * 100 : 0}%`,
                  background: segment.color,
                }}
              />
            ))}
          </div>
          <div className="workload-legend">
            {segments.map((segment) => (
              <div key={segment.label}>
                <span className="chart-legend-label">
                  <i style={{ background: segment.color }} />
                  {segment.label}
                </span>
                <strong>{segment.count}</strong>
              </div>
            ))}
          </div>
          <p className="chart-note">
            Availability is checked per request. Shared stock is rechecked when
            issued.
          </p>
        </section>
        <section
          className="metric-panel stock-panel"
          aria-labelledby="stock-chart-title"
        >
          <div className="section-heading">
            <h2 id="stock-chart-title">Stock availability</h2>
            <Link href="/inventory" aria-label="View inventory">
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="stock-chart-body">
            <div
              className="stock-donut"
              aria-hidden="true"
              style={
                {
                  "--stock-gradient": stock.totalItems
                    ? `conic-gradient(#577960 0deg ${healthyAngle}deg, #c49b43 ${healthyAngle}deg ${lowAngle}deg, #bd6655 ${lowAngle}deg 360deg)`
                    : "#e9ece9",
                } as CSSProperties
              }
            >
              <div>
                <strong>{stock.totalItems}</strong>
                <span>supplies</span>
              </div>
            </div>
            <div
              className="stock-chart-legend"
              aria-label={`${stock.totalItems} supplies in this workspace`}
            >
              {[
                {
                  label: "Healthy",
                  count: healthy,
                  color: "#577960",
                  filter: "in",
                },
                {
                  label: "Low stock",
                  count: low,
                  color: "#c49b43",
                  filter: "low",
                },
                {
                  label: "Unavailable",
                  count: out,
                  color: "#bd6655",
                  filter: "out",
                },
              ].map((item) => (
                <Link key={item.label} href={`/inventory?stock=${item.filter}`}>
                  <span className="chart-legend-label">
                    <i style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <strong>{item.count}</strong>
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <p className="chart-note">
            Based on available stock after holds. Counts represent distinct
            supplies.
          </p>
        </section>
        <section
          className="metric-panel activity-panel"
          aria-labelledby="activity-title"
        >
          <div className="activity-summary">
            <h2 id="activity-title">Requests issued</h2>
            <div className="metric-headline">
              <strong>{issued}</strong>
            </div>
            <p>Last 7 calendar days · UTC</p>
            <span className="chart-note">Includes seeded demo history</span>
          </div>
          <div className="issuance-chart" aria-label="Daily issued requests">
            {activity.map((day) => (
              <div className="issuance-column" key={day.date}>
                <strong>{day.count}</strong>
                <div className="issuance-bar-track">
                  <div style={{ height: `${(day.count / peak) * 100}%` }} />
                </div>
                <time dateTime={day.date}>
                  {new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section
          className="operations-section"
          id="work-queue"
          aria-labelledby="queue-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="queue-title">
                {viewer.role === "admin" ? "Work queue" : "Your next deadlines"}
              </h2>
              <p className="chart-note">
                Open requests · earliest required date first
              </p>
            </div>
            <Link href="/requests?sort=requiredBy&dir=asc">
              View requests <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {queue.length ? (
            <div className="table-wrap">
              <table className="dashboard-queue">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Required by</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <Link
                          className="record-link"
                          href={`/requests/${request.id}`}
                        >
                          {request.requestCode}
                        </Link>
                        <span className="cell-subtext">
                          {request.items.length}{" "}
                          {request.items.length === 1 ? "item" : "items"}
                          {request.status === "approved" &&
                          request.items.some(
                            (item) =>
                              item.availableQuantity < item.requestedQuantity,
                          )
                            ? " · Stock needed"
                            : ""}
                        </span>
                      </td>
                      <td>
                        {new Date(request.requiredBy).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td>
                        <StatusBadge status={request.status} />
                      </td>
                      <td>
                        <Link
                          href={`/requests/${request.id}`}
                          aria-label={`Open ${request.requestCode}`}
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-card">
              <h3>No open requests</h3>
              <p>New requests will appear here with their next deadline.</p>
            </div>
          )}
        </section>
        <section className="operations-section" aria-labelledby="risk-title">
          <div className="section-heading">
            <h2 id="risk-title">Stock to watch</h2>
            <Link href="/inventory" aria-label="View all inventory">
              <ArrowRight size={16} />
            </Link>
          </div>
          {risks.rows.length ? (
            risks.rows.map((item) => (
              <Link
                className="stock-watch-row"
                key={item.id}
                href={`/inventory/${item.id}`}
              >
                <span>
                  <strong>{item.name}</strong>
                  <span className="cell-subtext">
                    {item.available <= 0 ? "Unavailable" : "Low stock"}
                  </span>
                </span>
                <span>
                  <strong>{item.available}</strong> {item.unit}
                </span>
              </Link>
            ))
          ) : (
            <p className="muted">
              All supplies are above their low-stock thresholds.
            </p>
          )}
        </section>
      </div>
      <details className="walkthrough-disclosure">
        <summary>Try a guided scenario</summary>
        <div className="demo-scenarios">
          <Link href="/requests?q=REQ-DEMO-1">Ordinary fulfillment</Link>
          <Link href="/requests?q=REQ-DEMO-2">Shortage recovery</Link>
          <Link href="/requests?q=Competing">Competing requests</Link>
        </div>
        <p>
          Approve a request, record missing stock, then issue the supplies.
          Approval does not deduct stock.
        </p>
        <ReviewAsAdminButton />
      </details>
      <ProductFooter />
    </main>
  );
}
