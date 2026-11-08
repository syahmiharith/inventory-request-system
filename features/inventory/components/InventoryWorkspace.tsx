import { Dropdown } from "@/components/ui/forms/Dropdown";
import { ProductFooter } from "@/components/layout/ProductFooter";
import Link from "next/link";
import { MetricOverview } from "@/components/ui/MetricOverview";
import { getDashboardInventoryKpis } from "@/features/dashboard/services/dashboard.service";
import { ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { DataTable } from "@/components/ui/table/DataTable";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/table/Pagination";
import { SortHeader, sortAria } from "@/components/ui/table/SortHeader";
import { StockBadge } from "@/components/ui/badges/StockBadge";
import type { User } from "@/db/schema";
import { stockStatusFromQuantities } from "@/lib/inventory";
import { listItems } from "@/features/inventory/services/inventory.service";
import { InventoryCreateModalButton } from "./InventoryCreateModalButton";

export type InventoryWorkspaceSearchParams = {
  category?: string;
  page?: string;
  q?: string;
  dir?: string;
  sort?: string;
  stock?: string;
  success?: string;
};

const pageSize = 25;
const stockFilters = ["in", "low", "out"] as const;
const inventorySortKeys = [
  "name",
  "sku",
  "category",
  "available",
  "stockHealth",
  "status",
  "updated",
] as const;
const sortDirections = ["asc", "desc"] as const;
export async function InventoryWorkspace({
  currentUser,
  overlay,
  panel,
  panelFooter,
  selectedItemId,
  searchParams,
}: {
  currentUser: User;
  overlay?: React.ReactNode;
  panel?: React.ReactNode;
  panelFooter?: React.ReactNode;
  selectedItemId?: string;
  searchParams: InventoryWorkspaceSearchParams;
}) {
  const query = searchParams.q?.trim() ?? "";
  const selectedCategory = searchParams.category?.trim() ?? "";
  const selectedStock: "" | (typeof stockFilters)[number] =
    stockFilters.includes(searchParams.stock as (typeof stockFilters)[number])
      ? (searchParams.stock as (typeof stockFilters)[number])
      : "";
  const currentPage = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const selectedSort = inventorySortKeys.includes(
    searchParams.sort as (typeof inventorySortKeys)[number],
  )
    ? (searchParams.sort as (typeof inventorySortKeys)[number])
    : "name";
  const selectedDir = sortDirections.includes(
    searchParams.dir as (typeof sortDirections)[number],
  )
    ? (searchParams.dir as (typeof sortDirections)[number])
    : "asc";
  const [summary, itemResult] = await Promise.all([
    getDashboardInventoryKpis(currentUser),
    listItems({
      category: selectedCategory,
      dir: selectedDir,
      page: currentPage,
      pageSize,
      q: query,
      sort: selectedSort,
      stock: selectedStock,
    }),
  ]);
  const categories = itemResult.categories;
  const pagedItems = itemResult.rows;
  const selectedOutsideFilters =
    selectedItemId !== undefined &&
    !pagedItems.some((item) => item.id === selectedItemId);
  const isAdmin = currentUser.role === "admin";

  return (
    <WorkspaceLayout
      sidePanel={
        panel
          ? {
              children: panel,
              closeHref: "/inventory",
              footer: panelFooter,
              title: "Item Details",
            }
          : undefined
      }
    >
      <main
        className="page-scroll main-scroll-region route-page"
        data-testid="main-scroll-region"
      >
        <section data-testid="inventory-page">
          <PageHeader
            title="Inventory"
            description="Stock on hand, held aside, and available to issue."
            actions={isAdmin ? <InventoryCreateModalButton /> : null}
          />

          {!panel && (
            <MetricOverview
              label="Stock overview"
              total={summary.totalItems}
              noun="supplies"
              metrics={[
                {
                  label: "Healthy",
                  count: summary.totalItems - summary.lowStockItems,
                  color: "#577960",
                  href: "/inventory?stock=in",
                  active: selectedStock === "in",
                },
                {
                  label: "Low stock",
                  count:
                    summary.lowStockItems -
                    (summary.totalItems - summary.availableItems),
                  color: "#c49b43",
                  href: "/inventory?stock=low",
                  active: selectedStock === "low",
                },
                {
                  label: "Unavailable",
                  count: summary.totalItems - summary.availableItems,
                  color: "#bd6655",
                  href: "/inventory?stock=out",
                  active: selectedStock === "out",
                },
              ]}
              note="Available stock excludes holds. Select a summary to view that stock group across all supplies."
            />
          )}

          {searchParams.success ? (
            <p aria-live="polite" className="alert alert-success">
              {searchParams.success}
            </p>
          ) : null}
          {selectedOutsideFilters ? (
            <p aria-live="polite" className="alert alert-info">
              The selected item is outside the current page or filters. Clear
              filters or change pages to show it in the table.
            </p>
          ) : null}

          <section className="panel inventory-control-panel">
            <form
              action="/inventory"
              className="list-filter-form"
              role="search"
            >
              <DataToolbar>
                <label className="search-field">
                  <span className="sr-only">Search inventory</span>
                  <Search />
                  <input
                    className="input"
                    defaultValue={query}
                    name="q"
                    placeholder="Search supplies"
                    type="search"
                  />
                </label>
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
                <div className="filter-select">
                  <span>Stock</span>
                  <Dropdown
                    key={`stock-${selectedStock}`}
                    label="Stock"
                    name="stock"
                    defaultValue={selectedStock}
                    options={[
                      { value: "", label: "All" },
                      { value: "in", label: "In stock" },
                      { value: "low", label: "Low stock" },
                      { value: "out", label: "Out of stock" },
                    ]}
                  />
                </div>
                <button className="button button-secondary" type="submit">
                  Apply
                </button>
                {query ||
                selectedCategory ||
                selectedStock ||
                searchParams.sort ? (
                  <Link className="clear-filter-link" href="/inventory">
                    Clear filters
                  </Link>
                ) : null}
              </DataToolbar>
            </form>
            <p className="list-count-meta">
              {itemResult.totalCount}{" "}
              {itemResult.totalCount === 1 ? "supply" : "supplies"}
            </p>

            {itemResult.totalCount === 0 ? (
              <EmptyState
                title={
                  Boolean(query || selectedCategory || selectedStock)
                    ? "No matching supplies"
                    : "No supplies yet"
                }
                action={
                  Boolean(query || selectedCategory || selectedStock) ? (
                    <Link className="button button-secondary" href="/inventory">
                      Clear filters
                    </Link>
                  ) : isAdmin ? (
                    <InventoryCreateModalButton />
                  ) : null
                }
              >
                {Boolean(query || selectedCategory || selectedStock)
                  ? "Try a different search or clear your filters to see all supplies."
                  : "Add your first supply to start tracking stock."}
              </EmptyState>
            ) : (
              <DataTable className="inventory-table">
                <thead>
                  <tr>
                    <th aria-sort={sortAria("name", selectedSort, selectedDir)}>
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/inventory"
                        label="Item"
                        params={{
                          category: selectedCategory,
                          q: query,
                          stock: selectedStock,
                        }}
                        sortKey="name"
                      />
                    </th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th className="numeric-cell">On hand</th>
                    <th className="numeric-cell">Held aside</th>
                    <th
                      aria-sort={sortAria(
                        "available",
                        selectedSort,
                        selectedDir,
                      )}
                      className="numeric-cell"
                    >
                      <SortHeader
                        activeDir={selectedDir}
                        activeSort={selectedSort}
                        basePath="/inventory"
                        label="Available"
                        params={{
                          category: selectedCategory,
                          q: query,
                          stock: selectedStock,
                        }}
                        sortKey="available"
                      />
                    </th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Open details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => {
                    const status = stockStatusFromQuantities(
                      item.quantityOnHand,
                      item.quantityReserved,
                      item.reorderPoint,
                    );
                    return (
                      <ClickableRow
                        className={
                          status === "Out of Stock"
                            ? "is-out"
                            : status === "Low Stock"
                              ? "is-low"
                              : undefined
                        }
                        href={`/inventory/${item.id}`}
                        key={item.id}
                        selected={selectedItemId === item.id}
                      >
                        <td className="item-primary-cell" title={item.name}>
                          <strong>{item.name}</strong>
                          <span className="cell-subtext">{item.sku}</span>
                        </td>
                        <td>{item.category}</td>
                        <td>{item.unit}</td>
                        <td className="numeric-cell">{item.quantityOnHand}</td>
                        <td className="numeric-cell">
                          {item.quantityReserved}
                        </td>
                        <td className="numeric-cell">
                          <strong>{item.available}</strong>
                          <span className="mobile-unit"> {item.unit}</span>
                        </td>
                        <td>
                          <StockBadge status={status} />
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
            <p className="ledger-note">
              Available = on hand − held aside. Approval does not reserve stock.
            </p>
            {itemResult.totalCount > pageSize ? (
              <Pagination
                basePath="/inventory"
                page={itemResult.page}
                pageCount={itemResult.pageCount}
                searchParams={{
                  category: selectedCategory,
                  dir: selectedDir,
                  q: query,
                  sort: selectedSort,
                  stock: selectedStock,
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
