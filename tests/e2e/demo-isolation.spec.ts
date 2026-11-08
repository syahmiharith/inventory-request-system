import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
]) {
  test(`shortage handoff and issuance at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/api/demo/start");
    await page.goto("/requests?q=REQ-DEMO-2");
    await page.getByRole("row").filter({ hasText: "REQ-DEMO-2" }).click();
    await page
      .getByRole("button", { name: "Review this request as demo admin" })
      .click();
    await expect(
      page.getByRole("button", { name: "Approve", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm approve", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Issue", exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel("Item", { exact: true })
      .selectOption({ label: "Blue Ballpoint Pens" });
    await page.getByLabel("Quantity received").fill("2");
    await page
      .getByLabel("Delivery reference or reason")
      .fill("Delivery D-2026");
    await page
      .getByRole("button", { name: "Record stock received", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Issue", exact: true }),
    ).toBeEnabled({ timeout: 15000 });
    await page.getByRole("button", { name: "Issue", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm issue", exact: true })
      .click();
    await expect(
      page.getByText("Request Issued", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Stock Received", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Stock Issued", { exact: true })).toHaveCount(
      2,
    );
    await expect(
      page.getByRole("button", { name: "Issue", exact: true }),
    ).toHaveCount(0);
  });
}

test("independent sessions reject cross-workspace writes and survive another visitor reset", async ({
  browser,
  baseURL,
}) => {
  const a = await browser.newContext({ baseURL });
  const b = await browser.newContext({ baseURL });
  try {
    await a.request.get("/api/demo/start");
    await b.request.get("/api/demo/start");
    const requestsA = (await (await a.request.get("/api/requests")).json())
      .rows;
    const requestsB = (await (await b.request.get("/api/requests")).json())
      .rows;
    expect(requestsA).toHaveLength(7);
    expect(requestsB).toHaveLength(7);
    expect(requestsA.map((row: { id: string }) => row.id)).not.toContain(
      requestsB[0].id,
    );
    await a.request.post("/api/demo-user", {
      data: { email: "admin@inventory.local" },
    });
    const forbidden = await a.request.patch(
      `/api/requests/${requestsB[0].id}/status`,
      { data: { status: "approved" } },
    );
    expect(forbidden.status()).toBe(404);
    const adminA = (await (await a.request.get("/api/demo-user")).json())
      .currentUser;
    const otherEmployee = (await (await b.request.get("/api/demo-user")).json())
      .currentUser;
    expect(
      (
        await a.request.patch(`/api/requests/${requestsA[0].id}/status`, {
          data: { status: "approved", approverId: otherEmployee.id },
        })
      ).ok(),
    ).toBe(true);
    const approved = (
      await (await a.request.get("/api/requests")).json()
    ).rows.find((row: { id: string }) => row.id === requestsA[0].id);
    expect(approved.approverId).toBe(adminA.id);
    const foreignItems = (await (await b.request.get("/api/items")).json())
      .items;
    const creation = await a.request.post("/api/requests", {
      data: {
        department: "Operations",
        warehouse: "Main Warehouse",
        requiredBy: "2026-11-12",
        priority: "normal",
        reason: "Cross workspace attempt",
        items: [{ itemId: foreignItems[0].id, quantityRequested: 1 }],
      },
    });
    expect(creation.status()).toBe(404);
    expect((await a.request.post("/api/demo/reset")).ok()).toBe(true);
    expect(
      (await (await b.request.get("/api/requests")).json()).rows.map(
        (row: { id: string }) => row.id,
      ),
    ).toEqual(requestsB.map((row: { id: string }) => row.id));
    await a.addCookies([
      { name: "inventory-demo-session", value: "forged", url: baseURL! },
    ]);
    expect((await a.request.get("/api/items")).status()).toBe(410);
  } finally {
    await a.close();
    await b.close();
  }
});
