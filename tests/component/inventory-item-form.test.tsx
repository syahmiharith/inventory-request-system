// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { InventoryItemForm } from "@/features/inventory/components/InventoryItemForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/inventory/actions/actions", () => ({
  createInventoryItemAction: vi.fn(async () => ({
    message: "Please check the item code.",
    errors: { sku: "This code already exists." },
  })),
}));

test("failed creation retains every field and associates the error with its input", async () => {
  render(<InventoryItemForm />);
  fireEvent.change(screen.getByLabelText("Item name"), {
    target: { value: "Printer paper" },
  });
  fireEvent.change(screen.getByLabelText("SKU / code"), {
    target: { value: "PAPER" },
  });
  fireEvent.change(screen.getByLabelText("Category"), {
    target: { value: "Office" },
  });
  fireEvent.change(screen.getByLabelText("Opening stock"), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByLabelText(/Low-stock threshold/), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create item" }));
  await waitFor(() =>
    expect(screen.getByText("This code already exists.")).toBeVisible(),
  );
  expect(screen.getByLabelText(/SKU \/ code/)).toHaveValue("PAPER");
  expect(screen.getByLabelText(/SKU \/ code/)).toHaveAccessibleDescription(
    "This code already exists.",
  );
  expect(screen.getByLabelText("Item name")).toHaveValue("Printer paper");
  expect(screen.getByLabelText("Category")).toHaveValue("Office");
  expect(screen.getByLabelText("Opening stock")).toHaveValue(12);
  expect(screen.getByLabelText(/Low-stock threshold/)).toHaveValue(3);
});
