/** Fail closed if a Vercel deployment is given the other environment's login. */
export function assertDeploymentDatabase(url: string, environment?: string) {
  if (environment !== "preview" && environment !== "production") return;
  const role = decodeURIComponent(new URL(url).username).split(".")[0];
  const expected =
    environment === "preview"
      ? "inventory_preview_runtime"
      : "inventory_demo_runtime";
  if (role !== expected) {
    throw new Error(
      `The ${environment} deployment requires its isolated database login.`,
    );
  }
}
