import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { waitForRestore } from "../../scripts/demo-backup.mjs";

test(
  "restore waits past the temporary initialization server",
  { timeout: 90000 },
  async () => {
    const name = `inventory-readiness-${randomBytes(6).toString("hex")}`;
    const started = spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-d",
        "--name",
        name,
        "-e",
        "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:17-alpine",
        "sh",
        "-c",
        "printf 'SELECT pg_sleep(8);' > /docker-entrypoint-initdb.d/delay.sql; exec docker-entrypoint.sh postgres",
      ],
      { timeout: 60000 },
    );
    assert.equal(started.status, 0);
    try {
      await waitForRestore(name);
      const ready = spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { timeout: 5000 },
      );
      assert.equal(
        ready.status,
        0,
        "socket-only readiness must not accept the temporary server",
      );
      const query = spawnSync(
        "docker",
        [
          "exec",
          name,
          "psql",
          "-h",
          "127.0.0.1",
          "-U",
          "postgres",
          "-Atc",
          "select 1",
        ],
        { timeout: 5000 },
      );
      assert.equal(query.status, 0);
      assert.equal(query.stdout.toString().trim(), "1");
    } finally {
      spawnSync("docker", ["stop", name], { timeout: 15000 });
    }
  },
);
