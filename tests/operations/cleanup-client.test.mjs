import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runCleanup,
  verifyCleanupHistory,
} from "../../scripts/demo-cleanup.mjs";

test("cleanup safely retries a lost response and writes no credential into its receipt", async () => {
  let calls = 0;
  const result = await runCleanup({
    token: "test-only-cleanup-token",
    fetcher: async (url, options) => {
      assert.equal(new URL(url).pathname, "/api/demo/cleanup");
      assert.equal(
        options.headers.authorization,
        "Bearer test-only-cleanup-token",
      );
      assert.equal(options.redirect, "error");
      if (++calls === 1) throw new Error("Response lost after commit");
      return Response.json({ deleted: 0 });
    },
    now: () => new Date("2026-11-07T05:00:00Z"),
  });
  assert.deepEqual(result, {
    completedAt: "2026-11-07T05:00:00.000Z",
    deleted: 0,
    attempts: 2,
  });
  assert.equal(
    JSON.stringify(result).includes("test-only-cleanup-token"),
    false,
  );
});

test("cleanup rejects unauthorized, malformed, and persistently unavailable responses", async () => {
  let calls = 0;
  await assert.rejects(
    runCleanup({
      token: "test",
      fetcher: async () => {
        calls++;
        return new Response("Unauthorized", { status: 401 });
      },
    }),
    /401/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    runCleanup({
      token: "test",
      fetcher: async () => Response.json({ deleted: 201 }),
    }),
    /invalid result/,
  );
  calls = 0;
  await assert.rejects(
    runCleanup({
      token: "test",
      fetcher: async () => {
        calls++;
        throw new Error("Offline");
      },
    }),
    /three safe attempts/,
  );
  assert.equal(calls, 3);
});

test("cleanup history detects missing or stale runs even with no expired data", async () => {
  const now = Date.parse("2026-11-07T05:00:00Z");
  const check = (runs) =>
    verifyCleanupHistory({
      repository: "example/demo",
      token: "test",
      now,
      fetcher: async () => Response.json({ workflow_runs: runs }),
    });
  await assert.rejects(check([]), /No successful production cleanup/);
  await assert.rejects(
    check([
      {
        id: 1,
        conclusion: "success",
        head_branch: "main",
        updated_at: "2026-11-07T01:00:00Z",
      },
    ]),
    /No successful production cleanup/,
  );
  await assert.rejects(
    check([
      {
        id: 1,
        conclusion: "success",
        head_branch: "feature",
        updated_at: "2026-11-07T04:55:00Z",
      },
    ]),
    /No successful production cleanup/,
  );
  assert.deepEqual(
    await check([
      {
        id: 2,
        conclusion: "success",
        head_branch: "main",
        updated_at: "2026-11-07T04:55:00Z",
      },
    ]),
    { runId: 2, completedAt: "2026-11-07T04:55:00Z" },
  );
});
