import { it, expect, vi } from "vitest";
import { DomainError } from "@/lib/errors";
const state = vi.hoisted(() => ({ rate: vi.fn() }));
vi.mock("@/lib/demo-session", () => ({
  rateLimit: state.rate,
  hashToken: () => "test",
  createWorkspace: vi.fn(),
  workspaceCookie: "test-session",
}));
import { GET } from "@/app/api/demo/start/route";

it("shows a product page for throttled browser navigation while preserving the API's 429 contract", async () => {
  state.rate.mockRejectedValue(
    new DomainError("Demo activity limit reached", 429),
  );
  const browser = await GET(
    new Request("https://example.com/api/demo/start", {
      headers: { accept: "text/html" },
    }),
  );
  expect(browser.status).toBe(303);
  expect(browser.headers.get("location")).toBe(
    "https://example.com/demo-unavailable?reason=busy",
  );
  const api = await GET(new Request("https://example.com/api/demo/start"));
  expect(api.status).toBe(429);
});

it("keeps database failure details out of the browser's recovery URL", async () => {
  state.rate.mockRejectedValue(new Error("private database diagnostics"));
  const result = await GET(
    new Request("https://example.com/api/demo/start", {
      headers: { accept: "text/html" },
    }),
  );
  expect(result.status).toBe(303);
  expect(result.headers.get("location")).toBe(
    "https://example.com/demo-unavailable?reason=unavailable",
  );
});
