// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DetailStatusForm } from "@/features/requests/components/DetailStatusForm";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.stubGlobal("fetch", vi.fn());
});

describe("request action confirmation", () => {
  it("does not write before confirmation and restores focus when cancelled", () => {
    render(
      <DetailStatusForm
        requestId="request-1"
        status="approved"
        label="Approve"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Approve" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Approve request?" }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("retains the reason and idempotency key after a failed rejection", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Try again" }),
    } as Response);
    render(
      <DetailStatusForm
        requestId="request-1"
        status="rejected"
        label="Reject"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByLabelText("Reason for rejection"), {
      target: { value: "Duplicate request" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm reject" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Reason for rejection")).toHaveValue(
      "Duplicate request",
    );
    const first = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    fireEvent.click(screen.getByRole("button", { name: "Confirm reject" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const retry = JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string);
    expect(retry).toEqual(first);
    expect(first.adminComment).toBe("Duplicate request");
  });
  it("keeps an unavailable issuance action disabled", () => {
    render(
      <DetailStatusForm
        requestId="request-1"
        status="fulfilled"
        label="Issue"
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Issue" })).toBeDisabled();
  });
});
