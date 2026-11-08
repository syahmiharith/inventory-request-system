import type { InventoryItemDetail } from "./types";

export function InventoryItemDetailFooter({
  isAdmin,
  item,
}: {
  isAdmin: boolean;
  item: InventoryItemDetail;
}) {
  if (isAdmin) {
    return (
      <div className="item-panel-actions">
        <a
          className="button button-compact button-secondary"
          href={`/requests?status=pending&q=${encodeURIComponent(item.sku)}`}
        >
          View pending requests
        </a>
        <a
          className="button button-compact button-primary"
          href={`/requests?status=approved&q=${encodeURIComponent(item.sku)}`}
        >
          Review approved requests
        </a>
      </div>
    );
  }

  if (item.available <= 0) {
    return (
      <p className="alert alert-error">
        This item is currently out of stock and cannot be requested.
      </p>
    );
  }

  return (
    <a
      className="button button-compact button-primary"
      href={`/requests/new?itemId=${item.id}`}
    >
      Request Item
    </a>
  );
}
