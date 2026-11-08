import { expect, test } from "@playwright/test";

test("mobile navigation and role selector remain available within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/api/demo/start");
  await page.getByRole("button", { name: /Open account menu/ }).click();
  const roles = page.getByLabel("Viewing as");
  const box = await roles.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await navigation
    .getByRole("link", { name: "Inventory", exact: true })
    .click();
  await expect(page.getByTestId("inventory-page")).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Inventory", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await navigation
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
});

test("visitor submits two supplies, retains invalid input, and recovers a committed receipt with a lost response", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/api/demo/start");
  const items = (await (await page.request.get("/api/items")).json()).items;
  const paper = items.find((item: { sku: string }) => item.sku === "PAPER-001");
  const pen = items.find((item: { sku: string }) => item.sku === "PEN-001");
  await page
    .getByRole("link", { name: "Request supplies", exact: true })
    .click();
  const itemFields = page.getByRole("combobox", { name: "Item", exact: true });
  await expect(itemFields.first()).toBeEnabled({ timeout: 15000 });
  await itemFields.first().click();
  await page.getByRole("option", { name: /A4 Copy Paper/ }).click();
  await page.getByLabel("Quantity", { exact: true }).first().fill("3");
  await page.getByRole("button", { name: "Add another item" }).click();
  await itemFields.nth(1).click();
  await page.getByRole("option", { name: /Blue Ballpoint Pens/ }).click();
  await page.getByLabel("Quantity", { exact: true }).nth(1).fill("3");
  const reason = page.getByRole("textbox", { name: "Reason", exact: true });
  await reason.fill("   ");
  await page.getByRole("button", { name: "Submit 2 item request" }).click();
  await expect(
    page.getByText("Reason is required.", { exact: true }),
  ).toBeVisible();
  await expect(reason).toHaveValue("   ");
  await expect(reason).toHaveAccessibleDescription("Reason is required.");
  await expect(page.getByLabel("Quantity", { exact: true }).nth(1)).toHaveValue(
    "3",
  );
  await reason.fill("Two supplies for a team workshop");
  let creationResponseLost = false;
  await page.route("**/requests/new*", async (route) => {
    if (route.request().method() === "POST" && !creationResponseLost) {
      creationResponseLost = true;
      expect((await route.fetch()).ok()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Submit 2 item request" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Unable to confirm your request" }),
  ).toBeVisible();
  await expect(reason).toHaveValue("Two supplies for a team workshop");
  await expect(page.getByLabel("Quantity", { exact: true }).nth(1)).toHaveValue(
    "3",
  );
  await page.getByRole("button", { name: "Submit 2 item request" }).click();
  await expect(page).toHaveURL(/\/requests\/[a-f0-9-]+/);
  const submitted = (await (await page.request.get("/api/requests")).json())
    .rows;
  expect(
    submitted.filter(
      (request: { reason: string }) =>
        request.reason === "Two supplies for a team workshop",
    ),
  ).toHaveLength(1);
  const requestId = new URL(page.url()).pathname.split("/").pop();
  await page
    .getByRole("button", { name: "Review this request as demo admin" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/requests/${requestId}`));
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm approve", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Issue", exact: true }),
  ).toBeDisabled();
  const approvedItems = (await (await page.request.get("/api/items")).json())
    .items;
  expect(
    approvedItems.find((item: { id: string }) => item.id === pen.id)
      .quantityOnHand,
  ).toBe(1);
  expect(
    approvedItems.find((item: { id: string }) => item.id === paper.id)
      .quantityOnHand,
  ).toBe(paper.quantityOnHand);
  await page.getByRole("combobox", { name: "Item", exact: true }).click();
  await page
    .getByRole("option", { name: "Blue Ballpoint Pens", exact: true })
    .click();
  await page.getByLabel("Quantity received").fill("2");
  await page
    .getByLabel("Delivery reference or reason")
    .fill("WORKSHOP-DELIVERY");
  let responseLost = false;
  await page.route(`**/api/requests/${requestId}/receipts`, async (route) => {
    if (!responseLost) {
      responseLost = true;
      expect((await route.fetch()).ok()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Record stock received", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Unable to confirm delivery" }),
  ).toBeVisible();
  await expect(page.getByLabel("Quantity received")).toHaveValue("2");
  await expect(page.getByLabel("Delivery reference or reason")).toHaveValue(
    "WORKSHOP-DELIVERY",
  );
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
  await expect(page.getByText("Request Issued", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Request issued successfully." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Stock received. Review availability and issue the request.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(page.getByText("Stock Received", { exact: true })).toHaveCount(
    1,
  );
  await expect(page.getByText("Stock Issued", { exact: true })).toHaveCount(2);
  const final = (await (await page.request.get("/api/items")).json()).items;
  expect(
    final.find((item: { id: string }) => item.id === pen.id).quantityOnHand,
  ).toBe(0);
  expect(
    final.find((item: { id: string }) => item.id === paper.id).quantityOnHand,
  ).toBe(paper.quantityOnHand - 3);
});

test("graphical summaries open matching inventory and request records", async ({
  page,
}) => {
  await page.goto("/api/demo/start");
  await page.goto("/inventory");
  await page
    .getByRole("link", { name: "Show low stock: 1 supply", exact: true })
    .click();
  await expect(page).toHaveURL(/stock=low/);
  await expect(
    page.getByRole("cell", { name: /Blue Ballpoint Pens/ }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /A4 Copy Paper/ })).toHaveCount(
    0,
  );
  await page.goto("/requests");
  await page
    .getByRole("link", { name: "Show issued: 1 request", exact: true })
    .click();
  await expect(page).toHaveURL(/status=fulfilled/);
  await expect(
    page.getByRole("cell", { name: "Issued", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Pending", exact: true }),
  ).toHaveCount(0);
});

test("custom filters support keyboard selection and submit the chosen values on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/api/demo/start");
  await page.goto("/inventory");
  const stock = page.getByRole("combobox", { name: "Stock", exact: true });
  await stock.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("l");
  await page.keyboard.press("Enter");
  await expect(stock).toContainText("Low stock");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/stock=low/);
  await expect(page.getByRole("cell", { name: /A4 Copy Paper/ })).toHaveCount(
    0,
  );
  await page.goto("/requests");
  await page.getByRole("combobox", { name: "Status", exact: true }).click();
  const menu = page.getByRole("listbox", { name: "Status", exact: true });
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.getByRole("option", { name: "Issued", exact: true }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/status=fulfilled/);
  await expect(
    page.getByRole("cell", { name: "Pending", exact: true }),
  ).toHaveCount(0);
});

test("mobile calendar, account menu and problem reporting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/api/demo/start");
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Account menu" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Account menu" })).toHaveCount(
    0,
  );
  await page
    .getByRole("link", { name: "Request supplies", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose required date" }).click();
  const calendar = page.getByRole("dialog", {
    name: "Required date",
    exact: true,
  });
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(calendar).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Required by" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose required date" }).click();
  const selected = calendar.locator('[aria-pressed="true"]');
  await selected.click();
  await expect(calendar).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Required by" })).toHaveValue(
    /^\d{4}-\d{2}-\d{2}$/,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await page
    .getByRole("dialog", { name: "Account menu" })
    .getByRole("link", { name: "Report a problem" })
    .click();
  await expect(page).toHaveURL(/support/);
  await page.getByRole("button", { name: "Prepare report" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Add a short title" }),
  ).toBeVisible();
  await page.getByLabel("Short title").fill("Demo feedback");
  await page
    .getByLabel("What happened?")
    .fill("Synthetic test of the reporting workflow.");
  await page.getByRole("button", { name: "Prepare report" }).click();
  await expect(
    page.getByRole("link", { name: /Open GitHub draft/ }),
  ).toHaveAttribute("href", /github.com.*issues\/new/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
