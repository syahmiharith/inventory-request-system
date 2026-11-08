import { stockStatusFromQuantities } from "@/lib/inventory";
import type { InventoryItemDetail } from "./types";

export function InventoryMetricGrid({ item }: { item: InventoryItemDetail }) {
  const status = stockStatusFromQuantities(
    item.quantityOnHand,
    item.quantityReserved,
    item.reorderPoint,
  );

  return (
    <section className="detail-section">
      <div className="detail-section-header">
        <div>
          <h3>Stock position</h3>
          <p>Operational demand and inventory position.</p>
        </div>
      </div>
      <div className="detail-metric-grid">
        <MetricCard label="On hand" value={item.quantityOnHand} />
        <MetricCard label="Held aside" value={item.quantityReserved} />
        <MetricCard label="Active demand" value={item.activeDemand} />
        <MetricCard label="Pending requests" value={item.pendingRequestCount} />
        <MetricCard
          label="Approved requests"
          value={item.approvedRequestCount}
        />
        <MetricCard label="Stock status" value={status} />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="detail-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
