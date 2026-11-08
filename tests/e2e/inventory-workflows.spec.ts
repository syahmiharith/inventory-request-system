import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("smoke loads core routes", async ({ page }) => {
  await switchDemoUser(page, "Aisha Admin (admin)");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/inventory");
  await expect(page.getByTestId("inventory-page")).toBeVisible();
  await page.getByRole("button", { name: "Add Item" }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(
    page.getByRole("heading", { name: "Add inventory item" }).first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Add inventory item" }),
  ).toHaveCount(0);

  await page.goto("/inventory/new");
  await expect(
    page.getByRole("heading", { name: "Add inventory item" }).first(),
  ).toBeVisible();

  await page.goto("/requests");
  await expect(page.getByTestId("requests-page")).toBeVisible();

  await switchDemoUser(page, "Evan Employee (employee)");
  await page.goto("/requests");
  await page.getByRole("button", { name: "Create Request" }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(
    page.getByRole("heading", { name: "New request" }).first(),
  ).toBeVisible();
  await page.getByLabel("Reason").fill("Testing dirty Escape behavior");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "New request" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close form" }).click();
  await page.getByRole("button", { name: "Discard" }).click();

  await page.goto("/requests/new");
  await expect(
    page.getByRole("heading", { name: "New request" }).first(),
  ).toBeVisible();
});

test("filters inventory and request workspaces", async ({ page }) => {
  await switchDemoUser(page, "Aisha Admin (admin)");

  await page.goto("/inventory?q=A4&stock=in");
  await expect(page.getByTestId("inventory-page")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /A4 Copy Paper/i }),
  ).toBeVisible();

  await page.goto("/requests?status=pending&q=REQ");
  await expect(page.getByTestId("requests-page")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Pending" }).first(),
  ).toBeVisible();
});

test("employee creates request and cannot see admin actions", async ({
  page,
}) => {
  await createEmployeeRequest(page, 1, `E2E employee request ${Date.now()}`);

  await expect(page.getByTestId("request-detail-panel")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Admin Actions")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issue" })).toHaveCount(0);
});

test("admin approves and fulfills a request", async ({ page }) => {
  const requestUrl = await createEmployeeRequest(
    page,
    1,
    `E2E fulfill request ${Date.now()}`,
  );

  await switchDemoUser(page, "Aisha Admin (admin)");
  await page.goto(requestUrl);

  await page.getByRole("button", { name: "Approve" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm approve", exact: true })
    .click();
  await expect(
    page
      .getByTestId("request-detail-panel")
      .getByText("Approved", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Issue" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm issue", exact: true })
    .click();
  await expect(page.getByText("Request Issued", { exact: true })).toBeVisible();
});

test("insufficient stock blocks fulfillment", async ({ page }) => {
  const requestUrl = await createEmployeeRequest(
    page,
    9999,
    `E2E insufficient stock ${Date.now()}`,
  );

  await switchDemoUser(page, "Aisha Admin (admin)");
  await page.goto(requestUrl);
  await page.getByRole("button", { name: "Approve" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm approve", exact: true })
    .click();
  await expect(
    page
      .getByTestId("request-detail-panel")
      .getByText("Approved", { exact: true }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Issue" })).toBeDisabled();
  await expect(page.getByText("Insufficient stock").first()).toBeVisible();
  await expect(
    page
      .getByTestId("request-detail-panel")
      .getByText("Approved", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Quantity received").fill("10000");
  await page
    .getByLabel("Delivery reference or reason")
    .fill("E2E delivery D-101");
  await page
    .getByRole("button", { name: "Record stock received", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Stock received" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Issue", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm issue", exact: true })
    .click();
  await expect(page.getByText("Request Issued", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Record stock received" }),
  ).toHaveCount(0);
});

test("core routes respond within local performance budget", async ({
  page,
}) => {
  await switchDemoUser(page, "Aisha Admin (admin)");
  const routes = [
    "/",
    "/inventory",
    "/requests",
    "/inventory/new",
    "/requests/new",
  ];

  for (const route of routes) {
    const startedAt = Date.now();
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    const duration = Date.now() - startedAt;

    expect(
      response?.status(),
      `${route} should load successfully`,
    ).toBeLessThan(500);
    expect(duration, `${route} exceeded 10s local route budget`).toBeLessThan(
      10_000,
    );
  }
});

async function createEmployeeRequest(
  page: import("@playwright/test").Page,
  quantity: number,
  reason: string,
) {
  await switchDemoUser(page, "Evan Employee (employee)");
  await page.goto("/requests/new");
  await expect(page.getByLabel("Item").first()).toBeEnabled({
    timeout: 10_000,
  });
  await page.getByLabel("Quantity").fill(String(quantity));
  await page.getByLabel("Reason").fill(reason);
  await page.getByRole("button", { name: /Submit \d+ item request/ }).click();
  await expect(page).toHaveURL(/\/requests\/[a-f0-9-]+/);
  await expect(page.getByTestId("request-detail-panel")).toBeVisible();
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  return page.url();
}

async function switchDemoUser(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.goto("/");
  await page.getByLabel("Viewing as").selectOption({ label });
  await expect(page.getByLabel("Viewing as")).toHaveValue(
    label.includes("(admin)")
      ? "admin@inventory.local"
      : "employee@inventory.local",
  );
}
