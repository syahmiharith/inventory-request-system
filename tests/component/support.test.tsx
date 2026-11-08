// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import SupportPage from "@/app/(app)/support/page";
afterEach(cleanup);
it("retains input on validation and prepares a draft only after review", () => {
  render(<SupportPage />);
  fireEvent.click(screen.getByRole("button", { name: "Prepare report" }));
  expect(screen.getByRole("alert")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Short title"), {
    target: { value: "Calendar problem" },
  });
  fireEvent.change(screen.getByLabelText("What happened?"), {
    target: { value: "The selected date did not update." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Prepare report" }));
  const link = screen.getByRole("link", { name: /Open GitHub draft/ });
  const url = new URL(link.getAttribute("href")!);
  expect(url.searchParams.get("title")).toBe("Calendar problem");
  expect(url.searchParams.get("body")).toContain(
    "The selected date did not update.",
  );
  fireEvent.change(screen.getByLabelText("Short title"), {
    target: { value: "Revised title" },
  });
  expect(
    screen.queryByRole("link", { name: /Open GitHub draft/ }),
  ).not.toBeInTheDocument();
});
