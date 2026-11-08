// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Dropdown } from "@/components/ui/forms/Dropdown";

afterEach(cleanup);
const options = [
  { value: "", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];
it("commits keyboard selection to form data, closes, and retains focus", () => {
  render(
    <form data-testid="form">
      <Dropdown label="Stock" name="stock" options={options} />
    </form>,
  );
  const control = screen.getByRole("combobox", { name: "Stock" });
  control.focus();
  fireEvent.keyDown(control, { key: "ArrowDown" });
  fireEvent.keyDown(control, { key: "End" });
  fireEvent.keyDown(control, { key: "Enter" });
  expect(control).toHaveTextContent("Out of stock");
  expect(control).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(
    new FormData(screen.getByTestId("form") as HTMLFormElement).get("stock"),
  ).toBe("out");
});
it("Escape and outside pointer dismiss without committing a highlighted option", () => {
  render(<Dropdown label="Stock" options={options} />);
  const control = screen.getByRole("combobox");
  fireEvent.click(control);
  fireEvent.keyDown(control, { key: "End" });
  fireEvent.keyDown(control, { key: "Escape" });
  expect(control).toHaveTextContent("All");
  fireEvent.click(control);
  fireEvent.pointerDown(document.body);
  expect(control).toHaveAttribute("aria-expanded", "false");
});
it("typeahead selects options and disabled controls cannot open", () => {
  const { rerender } = render(<Dropdown label="Stock" options={options} />);
  const control = screen.getByRole("combobox");
  fireEvent.keyDown(control, { key: "l" });
  fireEvent.keyDown(control, { key: "Enter" });
  expect(control).toHaveTextContent("Low stock");
  rerender(<Dropdown label="Stock" options={options} disabled />);
  expect(control).toBeDisabled();
});
