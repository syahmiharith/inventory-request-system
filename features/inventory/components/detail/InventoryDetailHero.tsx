import { StockBadge } from "@/components/ui/badges/StockBadge";
import { stockStatusFromQuantities } from "@/lib/inventory";
import type { InventoryItemDetail } from "./types";
import { formatDate, normalizeStockHealthPercent } from "./utils";

export function InventoryDetailHero({ item }: { item: InventoryItemDetail }) {
  const status = stockStatusFromQuantities(
    item.quantityOnHand,
    item.quantityReserved,
    item.reorderPoint,
  );
  const stockHealthPercent = normalizeStockHealthPercent(
    item.stockHealthPercent,
  );
  const stockHealthLabel =
    stockHealthPercent === null ? "-" : `${stockHealthPercent}%`;

  return (
    <section className="inventory-detail-hero" aria-labelledby="item-title">
      <div className="inventory-detail-hero-top">
        <div className="inventory-detail-title">
          <span className="eyebrow">Inventory item</span>
          <h3 id="item-title">{item.name}</h3>
          <p className="sku-cell">{item.sku}</p>
        </div>
        <StockBadge status={status} />
      </div>

      <div className="inventory-health-summary">
        <div>
          <span>Available stock</span>
          <strong>
            {item.available} {item.unit}
          </strong>
          <p>
            Stock health {stockHealthLabel} · compared with the operating
            target.
          </p>
        </div>
      </div>

      <dl className="inventory-detail-meta">
        <div>
          <dt>Category</dt>
          <dd>{item.category}</dd>
        </div>
        <div>
          <dt>Warehouse</dt>
          <dd>{item.warehouse}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDate(item.updatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
