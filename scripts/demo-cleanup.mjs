import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export async function runCleanup({
  token,
  fetcher = fetch,
  now = () => new Date(),
}) {
  if (!token) throw new Error("Missing demo cleanup credential");
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetcher(
        "https://inventory-request-system-syahmiharith.vercel.app/api/demo/cleanup",
        {
          headers: { authorization: `Bearer ${token}` },
          redirect: "error",
          signal: AbortSignal.timeout(65000),
        },
      );
    } catch {
      if (attempt === 3)
        throw new Error(
          "Cleanup response unavailable after three safe attempts",
        );
      continue;
    }
    if (response.status >= 500 && attempt < 3) continue;
    if (!response.ok)
      throw new Error(`Cleanup endpoint returned HTTP ${response.status}`);
    const result = await response.json();
    if (
      !Number.isInteger(result.deleted) ||
      result.deleted < 0 ||
      result.deleted > 200
    )
      throw new Error("Cleanup endpoint returned an invalid result");
    return {
      completedAt: now().toISOString(),
      deleted: result.deleted,
      attempts: attempt,
    };
  }
}

export async function verifyCleanupHistory({
  repository,
  token,
  fetcher = fetch,
  now = Date.now(),
}) {
  if (!repository || !token) throw new Error("Missing cleanup history access");
  const response = await fetcher(
    `https://api.github.com/repos/${repository}/actions/workflows/demo-cleanup.yml/runs?branch=main&status=success&per_page=1`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("Cannot verify cleanup workflow history");
  const run = (await response.json()).workflow_runs?.[0];
  const age = now - Date.parse(run?.updated_at);
  if (
    !run ||
    run.conclusion !== "success" ||
    run.head_branch !== "main" ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 2 * 3600000
  )
    throw new Error("No successful production cleanup in the last two hours");
  return { runId: run.id, completedAt: run.updated_at };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const token = process.env.DEMO_CLEANUP_SECRET_FILE
      ? readFileSync(process.env.DEMO_CLEANUP_SECRET_FILE, "utf8").trim()
      : process.env.DEMO_CLEANUP_SECRET;
    const result = await runCleanup({ token });
    const receipt = {
      ...result,
      event: process.env.GITHUB_EVENT_NAME ?? "local",
      runId: process.env.GITHUB_RUN_ID ?? null,
    };
    mkdirSync("cleanup-receipts", { recursive: true });
    writeFileSync(
      join("cleanup-receipts", "cleanup.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log(JSON.stringify(receipt));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
