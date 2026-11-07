import { describe, expect, it, vi, beforeEach } from "vitest";

const mock = vi.hoisted(() => ({
  actor: vi.fn(),
  create: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mock.actor }));
vi.mock("@/features/requests/services/request.service", () => ({
  createRequest: mock.create,
}));
vi.mock("@/lib/cache-tags", () => ({
  revalidateRequestReads: mock.revalidate,
}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import { createInventoryRequestAction } from "@/features/requests/actions/createRequest";

function payload() {
  const form = new FormData();
  form.set("requesterName", "Demo employee");
  form.set("reason", "Keep this purpose");
  form.set("itemId", "11111111-1111-4111-8111-111111111111");
  form.set("quantityRequested", "3");
  form.set("key", "22222222-2222-4222-8222-222222222222");
  return form;
}

describe("request action recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it("returns a safe retry state when identity lookup loses database access", async () => {
    mock.actor.mockRejectedValue(new Error("private SQL connection detail"));
    const form = payload();
    const result = await createInventoryRequestAction({}, form);
    expect(result.message).toMatch(/values are kept/);
    expect(JSON.stringify(result)).not.toContain("private SQL");
    expect(mock.create).not.toHaveBeenCalled();
    expect(form.get("reason")).toBe("Keep this purpose");
  });
  it("returns the committed request ID and forwards the stable replay key", async () => {
    mock.actor.mockResolvedValue({ id: "actor", department: "Operations" });
    mock.create.mockResolvedValue({ id: "saved-request" });
    expect(await createInventoryRequestAction({}, payload())).toEqual({
      requestId: "saved-request",
    });
    expect(mock.create.mock.calls[0][0].key).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
  });
});
