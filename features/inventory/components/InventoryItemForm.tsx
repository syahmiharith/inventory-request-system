"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { ConfirmDiscardDialog } from "@/components/ui/modal/ConfirmDiscardDialog";
import { FormModal } from "@/components/ui/modal/FormModal";
import {
  createInventoryItemAction,
  type CreateInventoryItemState,
} from "@/features/inventory/actions/actions";

const initialState: CreateInventoryItemState = {};

export function InventoryItemForm({
  onClose,
}: {
  onClose?: () => void;
} = {}) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: "",
    sku: "",
    category: "",
    quantityAvailable: "",
    lowStockThreshold: "5",
  });
  const [dirty, setDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [state, formAction, pending] = useActionState(
    createInventoryItemAction,
    initialState,
  );

  function closeCleanForm() {
    if (onClose) {
      onClose();
      return;
    }
    router.push("/inventory");
  }

  function closeForm() {
    if (dirty) {
      setShowDiscardDialog(true);
      return;
    }

    closeCleanForm();
  }

  return (
    <FormModal
      description="All fields are required unless marked optional."
      disableEscapeClose={showDiscardDialog}
      onClose={closeForm}
      title="Add inventory item"
    >
      <form
        action={formAction}
        className="form-panel"
        aria-busy={pending}
        onChange={() => setDirty(true)}
      >
        {state.message ? (
          <p aria-live="polite" className="form-message error">
            {state.message}
          </p>
        ) : null}

        <div className="form-grid two-column-form">
          <label className="field">
            <span>Item name</span>
            <input
              aria-invalid={Boolean(state.errors?.name)}
              className="input"
              name="name"
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              aria-describedby={
                state.errors?.name ? "inventory-name-error" : undefined
              }
              required
            />
            <FieldError
              id="inventory-name-error"
              message={state.errors?.name}
            />
          </label>

          <label className="field">
            <span>SKU / code</span>
            <input
              aria-invalid={Boolean(state.errors?.sku)}
              className="input"
              name="sku"
              value={values.sku}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  sku: event.target.value,
                }))
              }
              aria-describedby={
                state.errors?.sku ? "inventory-sku-error" : undefined
              }
              required
            />
            <FieldError id="inventory-sku-error" message={state.errors?.sku} />
          </label>

          <label className="field">
            <span>Category</span>
            <input
              aria-invalid={Boolean(state.errors?.category)}
              className="input"
              name="category"
              value={values.category}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              aria-describedby={
                state.errors?.category ? "inventory-category-error" : undefined
              }
              required
            />
            <FieldError
              id="inventory-category-error"
              message={state.errors?.category}
            />
          </label>

          <label className="field">
            <span>Opening stock</span>
            <input
              aria-invalid={Boolean(state.errors?.quantityOnHand)}
              className="input"
              min="0"
              name="quantityAvailable"
              value={values.quantityAvailable}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  quantityAvailable: event.target.value,
                }))
              }
              aria-describedby={
                state.errors?.quantityOnHand
                  ? "inventory-quantityAvailable-error"
                  : undefined
              }
              required
              step="1"
              type="number"
            />
            <FieldError
              id="inventory-quantityAvailable-error"
              message={state.errors?.quantityOnHand}
            />
          </label>

          <label className="field">
            <span>
              Low-stock threshold <small>(optional)</small>
            </span>
            <input
              aria-invalid={Boolean(state.errors?.reorderPoint)}
              className="input"
              min="0"
              name="lowStockThreshold"
              value={values.lowStockThreshold}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  lowStockThreshold: event.target.value,
                }))
              }
              aria-describedby={
                state.errors?.reorderPoint
                  ? "inventory-lowStockThreshold-error"
                  : undefined
              }
              step="1"
              type="number"
            />
            <FieldError
              id="inventory-lowStockThreshold-error"
              message={state.errors?.reorderPoint}
            />
          </label>
        </div>

        <div className="button-row form-actions">
          <button
            className="button button-secondary"
            onClick={closeForm}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={pending}
            type="submit"
          >
            {pending ? "Creating..." : "Create item"}
          </button>
        </div>
      </form>

      {showDiscardDialog ? (
        <ConfirmDiscardDialog
          discardHref="/inventory"
          onDiscard={onClose}
          onKeepEditing={() => setShowDiscardDialog(false)}
        />
      ) : null}
    </FormModal>
  );
}

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) {
    return null;
  }
  return (
    <span id={id} className="form-message error">
      {message}
    </span>
  );
}
