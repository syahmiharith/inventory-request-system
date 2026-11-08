import { Dropdown } from "@/components/ui/forms/Dropdown";
import { ProductFooter } from "@/components/layout/ProductFooter";
import Link from "next/link";
import { MetricOverview } from "@/components/ui/MetricOverview";
import { getDashboardRequestKpis } from "@/features/dashboard/services/dashboard.service";
import { ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { DataTable } from "@/components/ui/table/DataTable";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/table/Pagination";
import { SortHeader, sortAria } from "@/components/ui/table/SortHeader";
import { StatusBadge } from "@/components/ui/badges/StatusBadge";
import type { User } from "@/db/schema";
import type { RequestStatus } from "@/lib/constants";
import { listRequests } from "@/features/requests/services/request.service";
import { RequestCreateModalButton } from "./RequestCreateModalButton";

export type RequestWorkspaceSearchParams = {
  category?: string;
  dir?: string;
  error?: string;
  page?: string;
  q?: string;
  sort?: string;
  status?: string;
  success?: string;
};

const requestStatuses: RequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
];
const pageSize = 25;
const requestSortKeys = [
  "request",
  "requester",
  "items",
  "quantity",
  "status",
  "stock",
  "created",
  "requiredBy",
] as const;
const sortDirections = ["asc", "desc"] as const;
type RequestRow = Awaited<ReturnType<typeof listRequests>>["rows"][number];
type RequestItemRow = RequestRow["items"][number];

export async function RequestsWorkspace({
  currentUser,
  overlay,
  panel,
  panelFooter,
  selectedRequestId,
  searchParams,
}: {
  currentUser: User;
  overlay?: React.ReactNode;
  panel?: React.ReactNode;
  panelFooter?: React.ReactNode;
  selectedRequestId?: string;
  searchParams: RequestWorkspaceSearchParams;
}) {
  const selectedStatus = requestStatuses.includes(
    searchParams.status as RequestStatus,
  )
    ? (searchParams.status as RequestStatus)
    : undefined;
  const query = searchParams.q?.trim() ?? "";
  const selectedCategory = searchParams.category?.trim() ?? "";
  const currentPage = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const selectedSort = requestSortKeys.includes(
    searchParams.sort as (typeof requestSortKeys)[number],
  )
    ? (searchParams.sort as (typeof requestSortKeys)[number])
    : "created";
  const selectedDir = sortDirections.includes(
    searchParams.dir as (typeof sortDirections)[number],
  )
    ? (searchParams.dir as (typeof sortDirections)[number])
    : "desc";
  const [summary, requestResult] = await Promise.all([
    getDashboardRequestKpis(currentUser),
    listRequests(
      {
        category: selectedCategory,
        dir: selectedDir,
        page: currentPage,
        pageSize,
        q: query,
        sort: selectedSort,
        status: selectedStatus,
      },
      currentUser,
    ),
  ]);
  const isAdmin = currentUser.role === "admin";
  const categories = requestResult.categories;
  const pagedRequests = requestResult.rows;
  const selectedOutsideFilters =
    selectedRequestId !== undefined &&
    !pagedRequests.some((request) => request.id === selectedRequestId);

  const context = new URLSearchParams();
  for (const key of [
    "category",
    "dir",
    "page",
    "q",
    "sort",
    "status",
  ] as const) {
    if (searchParams[key]) context.set(key, searchParams[key]!);
  }
  const contextQuery = context.size ? `?${context}` : "";
  return (
    <WorkspaceLayout
      sidePanel={
        panel
          ? {
              children: panel,
              closeHref: `/requests${contextQuery}`,
              footer: panelFooter,
              title: "Request Details",
            }
          : undefined
      }
    >
      <main
        className="page-scroll main-scroll-region route-page"
        data-testid="main-scroll-region"
      >
        <section data-testid="requests-page">
          <PageHeader
            title="Requests"
            description={
              isAdmin
                ? "Review requests, resolve shortages, and issue supplies."
                : "Track your requests from submission to issuance."
            }
            actions={
              !isAdmin ? (
                <RequestCreateModalButton requesterName={currentUser.name} />
              ) : null
            }
          />

          {!panel && (
            <MetricOverview
              label={isAdmin ? "Request overview" : "Your request overview"}
              total={summary.totalRequests}
              noun="requests"
              metrics={[
                {
                  label: "Awaiting review",
                  count: summary.pendingRequests,
                  color: "#c49b43",
                  href: "/requests?status=pending",
                  active: selectedStatus === "pending",
                },
                {
                  label: "Approved",
                  count: summary.approvedRequests,
                  color: "#768ba0",
                  href: "/requests?status=approved",
                  active: selectedStatus === "approved",
                },
                {
                  label: "Issued",
                  count: summary.fulfilledRequests,
                  color: "#577960",
                  href: "/requests?status=fulfilled",
                  active: selectedStatus === "fulfilled",
                },
                {
                  label: "Rejected",
                  count:
                    summary.totalRequests -
                    summary.pendingRequests -
                    summary.approvedRequests -
                    summary.fulfilledRequests,
                  color: "#9b817c",
                  href: "/requests?status=rejected",
                  active: selectedStatus === "rejected",
                },
              ]}
              note={`${summary.approvedRequests - summary.blockedFulfillment} approved with stock available · ${summary.blockedFulfillment} blocked by stock. Availability is checked again at issuance.`}
            />
          )}

          {searchParams.success && !panel ? (
            <p aria-live="polite" className="alert alert-success">
              {searchParams.success}
            </p>
          ) : null}

          {searchParams.error && !panel ? (
            <p aria-live="polite" className="alert alert-error">
              {searchParams.error}
            </p>
          ) : null}
          {selectedOutsideFilters ? (
            <p aria-live="polite" className="alert alert-info">
              The selected request is outside the current page or filters. Clear
              filters or change pages to show it in the table.
            </p>
          ) : null}

          <section className="panel">
            <form action="/requests" className="list-filter-form" role="search">
              <DataToolbar>
                <label className="search-field">
                  <span className="sr-only">Search requests</span>
                  <Search />
                  <input
                    className="input"
                    defaultValue={searchParams.q ?? ""}
                    name="q"
                    placeholder="Search requests"
                    type="search"
                  />
                </label>
                <div className="filter-select">
                  <span>Status</span>
                  <Dropdown
                    key={`status-${selectedStatus}`}
                    label="Status"
                    name="status"
                    defaultValue={selectedStatus ?? ""}
                    options={[
                      { value: "", label: "All" },
                      ...requestStatuses.map((status) => ({
                        value: status,
                        label:
                          status === "fulfilled"
                            ? "Issued"
                            : capitalize(status),
                      })),
                    ]}
                  />
                </div>
                <div className="filter-select">
                  <span>Category</span>
                  <Dropdown
                    key={`category-${selectedCategory}`}
                    label="Category"
                    name="category"
                    defaultValue={selectedCategory}
                    options={[
                      { value: "", label: "All" },
                      ...categories.map((category) => ({
                        value: category,
                        label: category,
                      })),
                    ]}
                  />
                </div>
                <button className="button button-secondary" type="submit">
                  Apply
                </button>
                {query ||
                selectedStatus ||
                selectedCategory ||
                searchParams.sort ? (
                  <Link className="clear-filter-link" href="/requests">
                    Clear filters
                  </Link>
                ) : null}
              </DataToolbar>
            </form>
            <p className="list-count-meta">
              {requestResult.totalCount}{" "}
              {requestResult.totalCount === 1 ? "request" : "requests"}
            </p>

            {requestResult.totalCount === 0 ? (
              <EmptyState
                title={
                  Boolean(query || selectedCategory || selectedStatus)
                    ? "No matching requests"
                    : "No requests yet"
                }
                action={
                  Boolean(query || selectedCategory || selectedStatus) ? (
                    <Link className="button button-secondary" href="/requests">
                      Clear filters
                    </Link>
                  ) : !isAdmin ? (
                    <RequestCreateModalButton
                      requesterName={currentUser.name}
                    />
                  ) : null
                }
              >
                {Boolean(query || selectedCategory || selectedStatus)
                  ? "Try a different search or clear your filters to see all requests."
                  : "Submitted requests will appear here with their current status."}
              </EmptyState>
            ) : (
              <DataTable className="requests-table">
                <thead>
                  <tr>
                    <th
                      aria-sort={sortAria("request", selectedSort, selectedDir)}
                      className="col-code"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Request"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="request"
                      />
                    </th>
                    <th
                      aria-sort={sortAria(
                        "requester",
                        selectedSort,
                        selectedDir,
                      )}
                      className="col-person"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Requester"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="requester"
                      />
                    </th>
                    <th
                      aria-sort={sortAria("items", selectedSort, selectedDir)}
                      className="col-items"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Items"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="items"
                      />
                    </th>
                    <th
                      aria-sort={sortAria("status", selectedSort, selectedDir)}
                      className="col-status"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Status"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="status"
                      />
                    </th>
                    <th
                      aria-sort={sortAria("stock", selectedSort, selectedDir)}
                      className="col-stock hide-md"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Stock"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="stock"
                      />
                    </th>
                    <th
                      aria-sort={sortAria("created", selectedSort, selectedDir)}
                      className="col-date hide-md"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/requests"
                        label="Created"
                        params={{
                          category: selectedCategory,
                          q: query,
                          status: selectedStatus ?? "",
                        }}
                        sortKey="created"
                      />
                    </th>
                    <th className="col-action">
                      <span className="sr-only">Open details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.map((request) => {
                    return (
                      <ClickableRow
                        href={`/requests/${request.id}${contextQuery}`}
                        key={request.id}
                        selected={selectedRequestId === request.id}
                      >
                        <td className="request-code-cell">
                          <strong className="mono-cell">
                            {request.requestCode}
                          </strong>
                          <span className="cell-subtext">
                            Due {formatDate(request.requiredBy)} ·{" "}
                            {capitalize(request.priority)}
                          </span>
                        </td>
                        <td title={request.requesterName}>
                          <RequesterCell
                            department={request.department}
                            name={request.requesterName}
                          />
                        </td>
                        <td title={formatItemTitle(request.items)}>
                          <RequestItemChips items={request.items} />
                        </td>
                        <td>
                          <StatusBadge status={request.status} />
                        </td>
                        <td className="hide-md">
                          <StockSummary
                            items={request.items}
                            status={request.status}
                          />
                        </td>
                        <td className="hide-md">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="row-chevron-cell">
                          <ChevronRight aria-hidden="true" />
                        </td>
                      </ClickableRow>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
            {requestResult.totalCount > pageSize ? (
              <Pagination
                basePath="/requests"
                page={requestResult.page}
                pageCount={requestResult.pageCount}
                searchParams={{
                  category: selectedCategory,
                  dir: selectedDir,
                  q: query,
                  sort: selectedSort,
                  status: selectedStatus ?? "",
                }}
              />
            ) : null}
          </section>
        </section>
        {overlay}
        <ProductFooter />
      </main>
    </WorkspaceLayout>
  );
}

function StockSummary({
  items,
  status,
}: {
  items: RequestItemRow[];
  status: RequestStatus;
}) {
  if (status === "fulfilled") {
    return <span className="badge badge-stock-issued">Issued</span>;
  }

  if (status === "rejected") {
    return <span className="badge badge-stock-closed">Closed</span>;
  }

  if (items.length === 0) {
    return <span className="badge badge-stock-closed">No items</span>;
  }

  const shortItems = items.filter(
    (item) => item.availableQuantity < item.requestedQuantity,
  );

  if (shortItems.length === 0) {
    return <span className="badge badge-stock-ready">Enough stock</span>;
  }

  if (shortItems.length === items.length) {
    return (
      <span className="badge badge-stock-insufficient">Insufficient stock</span>
    );
  }

  return (
    <span className="badge badge-stock-partial">
      {shortItems.length} item{shortItems.length === 1 ? "" : "s"} short
    </span>
  );
}

function RequestItemChips({ items }: { items: RequestItemRow[] }) {
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  if (items.length === 0) {
    return <span className="muted">No items</span>;
  }

  return (
    <span className="item-chip-list">
      {visibleItems.map((item) => (
        <span className="item-chip" key={item.id}>
          <span>{item.itemName}</span>
          <small>
            {item.requestedQuantity} {item.unit}
          </small>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="item-chip-more">+{hiddenCount} more</span>
      ) : null}
    </span>
  );
}

function formatItemTitle(items: RequestItemRow[]) {
  return items
    .map((item) => `${item.itemName} (${item.requestedQuantity} ${item.unit})`)
    .join(", ");
}

function RequesterCell({
  department,
  name,
}: {
  department: string;
  name: string;
}) {
  return (
    <span className="requester-cell">
      <span aria-hidden="true" className="portrait-avatar">
        {initials(name)}
      </span>
      <span className="requester-meta">
        <strong>{name}</strong>
        <small>{department}</small>
      </span>
    </span>
  );
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
