import { expect, test } from "@playwright/test";

test("mobile navigation and role selector remain available within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/api/demo/start");
  const roles = page.getByLabel("Viewing as");
  const box = await roles.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
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
    page.getByRole("heading", { name: "Request Dashboard", exact: true }),
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
  await itemFields.first().selectOption(paper.id);
  await page.getByLabel("Quantity", { exact: true }).first().fill("3");
  await page.getByRole("button", { name: "Add another item" }).click();
  await itemFields.nth(1).selectOption(pen.id);
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
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Approve", exact: true }).click();
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
  await page
    .getByRole("combobox", { name: "Item", exact: true })
    .selectOption(pen.id);
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
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await expect(page.getByText("Request Issued", { exact: true })).toBeVisible();
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
