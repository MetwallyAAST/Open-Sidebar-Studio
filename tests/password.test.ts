import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  hashToken,
} from "../lib/server/password";
test("password hashing uses unique salts and rejects wrong passwords", async () => {
  const password = "A-test-password-with-entropy-4812";
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert(await verifyPassword(password, hash));
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
  assert.notEqual(hashToken("a"), hashToken("b"));
});
