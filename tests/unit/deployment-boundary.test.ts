import { describe, expect, it } from "vitest";
import { assertDeploymentDatabase } from "../../db/deployment-boundary";

describe("deployment database boundary", () => {
  const url = (role: string) =>
    `postgres://${role}.project:example@pooler.example:6543/postgres`;
  it("rejects production and privileged credentials in previews", () => {
    for (const role of [
      "inventory_demo_runtime",
      "postgres",
      "inventory_demo_backup",
    ]) {
      expect(() => assertDeploymentDatabase(url(role), "preview")).toThrow(
        "isolated database login",
      );
    }
  });
  it("rejects preview credentials in production", () => {
    expect(() =>
      assertDeploymentDatabase(url("inventory_preview_runtime"), "production"),
    ).toThrow();
  });
  it("accepts only the matching hosted login and leaves local tests independent", () => {
    expect(() =>
      assertDeploymentDatabase(url("inventory_preview_runtime"), "preview"),
    ).not.toThrow();
    expect(() =>
      assertDeploymentDatabase(url("inventory_demo_runtime"), "production"),
    ).not.toThrow();
    expect(() => assertDeploymentDatabase(url("postgres"))).not.toThrow();
  });
});
