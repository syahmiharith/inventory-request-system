import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  inventoryItems,
  inventoryRequestItems,
  inventoryRequests,
  users,
} from "@/db/schema";
import {
  getDashboardPageData,
  getDashboardSummary,
  getIssuanceActivity,
} from "@/features/dashboard/services/dashboard.service";
import { resetDatabase } from "./test-db";

describe("dashboard summaries", () => {
  beforeEach(resetDatabase);

  it("scopes employee counts and exposes admin-wide counts", async () => {
    const [admin, employee, otherEmployee] = await db
      .insert(users)
      .values([
        { name: "Admin", email: "admin-summary@test.local", role: "admin" },
        {
          name: "Employee",
          email: "employee-summary@test.local",
          role: "employee",
        },
        { name: "Other", email: "other-summary@test.local", role: "employee" },
      ])
      .returning();

    await db.insert(inventoryRequests).values([
      {
        requesterId: employee.id,
        requestCode: "REQ-SUMMARY-1",
        department: "Marketing",
        warehouse: "Main Warehouse",
        requiredBy: new Date(),
        priority: "normal",
        reason: "Own request",
        status: "pending",
      },
      {
        requesterId: otherEmployee.id,
        requestCode: "REQ-SUMMARY-2",
        department: "Sales",
        warehouse: "Main Warehouse",
        requiredBy: new Date(),
        priority: "high",
        reason: "Other request",
        status: "approved",
      },
    ]);

    const employeeSummary = await getDashboardSummary(employee);
    const adminSummary = await getDashboardSummary(admin);

    expect(employeeSummary.all.count).toBe(1);
    expect(employeeSummary.pending.count).toBe(1);
    expect(adminSummary.all.count).toBe(2);
    expect(adminSummary.approved.count).toBe(1);
  });

  it("returns role-specific dashboard page metrics and recent requests", async () => {
    const [admin, employee, otherEmployee] = await db
      .insert(users)
      .values([
        { name: "Admin", email: "admin-page@test.local", role: "admin" },
        {
          name: "Employee",
          email: "employee-page@test.local",
          role: "employee",
        },
        { name: "Other", email: "other-page@test.local", role: "employee" },
      ])
      .returning();

    const [availableItem, lowStockItem] = await db
      .insert(inventoryItems)
      .values([
        {
          name: "A4 Paper",
          sku: "DASH-PAPER",
          category: "Office",
          warehouse: "Main Warehouse",
          unit: "Ream",
          quantityOnHand: 10,
          quantityReserved: 0,
          reorderPoint: 2,
        },
        {
          name: "Ink",
          sku: "DASH-INK",
          category: "Office",
          warehouse: "Main Warehouse",
          unit: "Each",
          quantityOnHand: 1,
          quantityReserved: 0,
          reorderPoint: 2,
        },
      ])
      .returning();

    const [ownRequest, otherRequest] = await db
      .insert(inventoryRequests)
      .values([
        {
          requesterId: employee.id,
          requestCode: "REQ-PAGE-1",
          department: "Marketing",
          warehouse: "Main Warehouse",
          requiredBy: new Date(),
          priority: "normal",
          reason: "Own request",
          status: "pending",
        },
        {
          requesterId: otherEmployee.id,
          requestCode: "REQ-PAGE-2",
          department: "Sales",
          warehouse: "Main Warehouse",
          requiredBy: new Date(),
          priority: "normal",
          reason: "Other request",
          status: "approved",
        },
      ])
      .returning();

    await db.insert(inventoryRequestItems).values([
      {
        requestId: ownRequest.id,
        itemId: availableItem.id,
        quantityRequested: 3,
        unit: availableItem.unit,
      },
      {
        requestId: otherRequest.id,
        itemId: lowStockItem.id,
        quantityRequested: 1,
        unit: lowStockItem.unit,
      },
    ]);

    const employeeDashboard = await getDashboardPageData(employee);
    const adminDashboard = await getDashboardPageData(admin);

    expect(adminDashboard.inventory.totalItems).toBe(2);
    expect(adminDashboard.inventory.lowStockItems).toBe(1);
    expect(adminDashboard.requests.pendingRequests).toBe(1);
    expect(adminDashboard.recentRequests).toHaveLength(2);

    expect(employeeDashboard.inventory.availableItems).toBe(2);
    expect(employeeDashboard.requests.totalRequests).toBe(1);
    expect(employeeDashboard.requests.pendingRequests).toBe(1);
    expect(employeeDashboard.recentRequests).toHaveLength(1);
    expect(employeeDashboard.recentRequests[0].requestCode).toBe("REQ-PAGE-1");
  });
});

describe("issuance chart", () => {
  beforeEach(resetDatabase);
  it("uses issuance dates, fills empty days, excludes older records and scopes employees", async () => {
    const [admin, employee, other] = await db
      .insert(users)
      .values([
        { name: "Admin", email: "chart-admin@test.local", role: "admin" },
        {
          name: "Employee",
          email: "chart-employee@test.local",
          role: "employee",
        },
        { name: "Other", email: "chart-other@test.local", role: "employee" },
      ])
      .returning();
    const now = new Date("2026-11-08T12:00:00Z");
    const common = {
      department: "Office",
      warehouse: "Main",
      requiredBy: now,
      reason: "Chart fixture",
      status: "fulfilled" as const,
    };
    await db.insert(inventoryRequests).values([
      {
        ...common,
        requesterId: employee.id,
        requestCode: "CHART-1",
        fulfilledAt: new Date("2026-11-02T00:00:00Z"),
      },
      {
        ...common,
        requesterId: employee.id,
        requestCode: "CHART-2",
        fulfilledAt: new Date("2026-11-08T10:00:00Z"),
      },
      {
        ...common,
        requesterId: other.id,
        requestCode: "CHART-3",
        fulfilledAt: new Date("2026-11-08T11:00:00Z"),
      },
      {
        ...common,
        requesterId: employee.id,
        requestCode: "CHART-4",
        fulfilledAt: new Date("2026-11-01T23:59:59Z"),
      },
      {
        ...common,
        requesterId: employee.id,
        requestCode: "CHART-5",
        status: "pending",
        fulfilledAt: null,
      },
    ]);
    const all = await getIssuanceActivity(admin, now);
    const own = await getIssuanceActivity(employee, now);
    expect(all).toHaveLength(7);
    expect(all[0]).toEqual({ date: "2026-11-02", count: 1 });
    expect(all[1]).toEqual({ date: "2026-11-03", count: 0 });
    expect(all[6]).toEqual({ date: "2026-11-08", count: 2 });
    expect(own[6].count).toBe(1);
    expect(own.reduce((sum, day) => sum + day.count, 0)).toBe(2);
  });
});
