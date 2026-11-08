// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DatePicker } from "@/components/ui/forms/DatePicker";
afterEach(cleanup);
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("selects across a month boundary and returns ISO values", () => {
  const change = vi.fn();
  render(<DatePicker value="2026-11-30" onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose required date" }));
  const selected = screen.getByRole("button", {
    name: "Monday, November 30, 2026",
  });
  fireEvent.keyDown(selected, { key: "ArrowRight" });
  expect(
    screen.getByRole("button", { name: "Tuesday, December 1, 2026" }),
  ).toHaveFocus();
  fireEvent.click(
    screen.getByRole("button", { name: "Tuesday, December 1, 2026" }),
  );
  expect(change).toHaveBeenCalledWith("2026-12-01");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("allows typed dates and cancels without changing the selection", () => {
  const change = vi.fn();
  render(<DatePicker value="2026-11-15" onChange={change} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Required by" }), {
    target: { value: "2026-12-10" },
  });
  expect(change).toHaveBeenCalledWith("2026-12-10");
  change.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Choose required date" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(change).not.toHaveBeenCalled();
});
