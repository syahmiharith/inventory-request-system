import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "../../scripts/demo-backup.mjs";

test("backup encryption rejects tampering and incorrect recovery keys", () => {
  const key = randomBytes(32);
  const payload = Buffer.from("private workspace backup");
  const encrypted = encrypt(payload, key);
  assert.equal(encrypted.includes(payload), false);
  assert.deepEqual(decrypt(encrypted, key), payload);
  assert.throws(() => decrypt(encrypted, randomBytes(32)));
  const tampered = Buffer.from(encrypted);
  tampered[20] ^= 1;
  assert.throws(() => decrypt(tampered, key));
});
