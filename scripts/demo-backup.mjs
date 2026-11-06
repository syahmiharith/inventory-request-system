import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deepStrictEqual } from "node:assert";
import { connect, manifest, secret } from "./demo-operations.mjs";

export function encrypt(payload, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([
    Buffer.from("IDB1"),
    iv,
    cipher.update(payload),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
}
export function decrypt(payload, key) {
  if (payload.subarray(0, 4).toString() !== "IDB1")
    throw new Error("Unsupported backup format");
  const cipher = createDecipheriv("aes-256-gcm", key, payload.subarray(4, 16));
  cipher.setAuthTag(payload.subarray(-16));
  return Buffer.concat([
    cipher.update(payload.subarray(16, -16)),
    cipher.final(),
  ]);
}

function docker(args, options = {}) {
  const result = spawnSync("docker", args, {
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180000,
    ...options,
  });
  // Docker/Postgres diagnostics can contain connection details. Keep them private.
  if (result.status !== 0)
    throw new Error(
      `Backup command failed (${args[0]}), exit ${result.status}`,
    );
  return result.stdout;
}

async function verify(dump, expected, temp) {
  const name = `inventory-restore-${randomBytes(6).toString("hex")}`;
  const password = randomBytes(32).toString("hex");
  docker(
    [
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD",
      "-p",
      "127.0.0.1::5432",
      "postgres:17-alpine",
    ],
    {
      env: { ...process.env, POSTGRES_PASSWORD: password },
    },
  );
  let restored;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const check = spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-U", "postgres"],
        { timeout: 5000 },
      );
      if (check.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Disposable restore database did not start");
    docker([
      "exec",
      name,
      "psql",
      "-U",
      "postgres",
      "-c",
      "CREATE ROLE inventory_demo_backup NOLOGIN",
    ]);
    docker(
      [
        "exec",
        "-i",
        name,
        "pg_restore",
        "--exit-on-error",
        "--no-owner",
        "--no-acl",
        "-U",
        "postgres",
        "-d",
        "postgres",
      ],
      { input: dump },
    );
    const port = docker(["port", name, "5432"])
      .toString()
      .trim()
      .split(":")
      .pop();
    restored = connect(
      `postgres://postgres:${password}@127.0.0.1:${port}/postgres`,
    );
    const actual = await restored.begin("read only", manifest);
    deepStrictEqual(actual, expected);
    writeFileSync(
      join(temp, "verified.json"),
      JSON.stringify({
        tables: actual.tables.length,
        rows: actual.tables.reduce((sum, t) => sum + t.rows, 0),
        constraints: actual.constraints.length,
      }),
    );
    return actual;
  } finally {
    if (restored) await restored.end();
    docker(["stop", name]);
  }
}

async function main() {
  const key = Buffer.from(secret("DEMO_BACKUP_KEY"), "hex");
  if (key.length !== 32)
    throw new Error("Backup key must contain 32 bytes as hexadecimal");
  const temp = mkdtempSync(join(tmpdir(), "inventory-backup-"));
  let source;
  try {
    let archive, expected;
    if (process.argv[2] === "verify") {
      const payload = JSON.parse(decrypt(readFileSync(process.argv[3]), key));
      archive = Buffer.from(payload.dump, "base64");
      expected = payload.manifest;
    } else {
      const url = secret("DEMO_DATABASE_URL");
      const parsed = new URL(url);
      if (
        decodeURIComponent(parsed.username) !==
        "inventory_demo_backup.uqpziaedfdmokzlknhcc"
      )
        throw new Error("Use the read-only hosted backup role for backups");
      source = connect(url);
      await source.begin(
        "isolation level repeatable read read only",
        async (tx) => {
          const [{ snapshot }] =
            await tx`select pg_export_snapshot() as snapshot`;
          const env = {
            ...process.env,
            PGHOST: parsed.hostname,
            PGPORT: parsed.port || "5432",
            PGDATABASE: parsed.pathname.slice(1),
            PGUSER: decodeURIComponent(parsed.username),
            PGPASSWORD: decodeURIComponent(parsed.password),
            PGSSLMODE: "require",
          };
          archive = docker(
            [
              "run",
              "--rm",
              "-e",
              "PGHOST",
              "-e",
              "PGPORT",
              "-e",
              "PGDATABASE",
              "-e",
              "PGUSER",
              "-e",
              "PGPASSWORD",
              "-e",
              "PGSSLMODE",
              "postgres:17-alpine",
              "pg_dump",
              "--format=custom",
              "--no-owner",
              "--no-acl",
              "--schema=inventory_demo",
              "--enable-row-security",
              `--snapshot=${snapshot}`,
            ],
            { env },
          );
          expected = await manifest(tx);
        },
      );
    }
    const actual = await verify(archive, expected, temp);
    if (process.argv[2] !== "verify") {
      const directory = resolve(process.env.DEMO_BACKUP_DIR ?? "backups");
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      const destination = join(directory, `inventory-${Date.now()}.enc`);
      const payload = Buffer.from(
        JSON.stringify({
          createdAt: new Date().toISOString(),
          manifest: expected,
          dump: archive.toString("base64"),
        }),
      );
      const encrypted = encrypt(payload, key);
      deepStrictEqual(decrypt(encrypted, key), payload);
      writeFileSync(destination, encrypted, { mode: 0o600 });
    }
    console.log(
      JSON.stringify({
        backup: "verified",
        tables: actual.tables.length,
        rows: actual.tables.reduce((sum, t) => sum + t.rows, 0),
        constraints: actual.constraints.length,
        indexes: actual.indexes.length,
      }),
    );
  } finally {
    if (source) await source.end();
    rmSync(temp, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
)
  main().catch((error) => {
    console.error(
      "Demo backup/restore failed. No plaintext backup was retained.",
    );
    console.error(error.message);
    process.exitCode = 1;
  });
