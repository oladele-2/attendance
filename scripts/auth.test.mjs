import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import bcrypt from "bcryptjs";

// Run the real authentication module in Node with a Worker binding stub.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export const env = process.env",
        shortCircuit: true,
      };
    }
    if (specifier === "./types" && context.parentURL?.endsWith("/lib/auth.ts")) {
      return nextResolve("./types.ts", context);
    }
    return nextResolve(specifier, context);
  },
});

const { hashPassword, verifyPhpPassword } = await import("../lib/auth.ts");

test("Ajirmed standard bcrypt accounts do not depend on surname or pepper", () => {
  const hash = bcrypt.hashSync("test-password", 4).replace(/^\$2b\$/, "$2y$");
  assert.equal(verifyPhpPassword("test-password", "Surname", hash), true);
  assert.equal(verifyPhpPassword("test-password", "", hash), true);
  assert.equal(verifyPhpPassword("wrong-password", "Surname", hash), false);
});

test("legacy PHP accounts still require password, surname and pepper", () => {
  const previous = process.env.PASSWORD_PEPPER;
  process.env.PASSWORD_PEPPER = "test-legacy-pepper";
  try {
    const hash = bcrypt.hashSync("test-passwordSurname" + process.env.PASSWORD_PEPPER, 4)
      .replace(/^\$2b\$/, "$2y$");
    assert.equal(verifyPhpPassword("test-password", "Surname", hash), true);
    assert.equal(verifyPhpPassword("wrong-password", "Surname", hash), false);
    assert.equal(verifyPhpPassword("test-password", "Other", hash), false);
    process.env.PASSWORD_PEPPER = "wrong-pepper";
    assert.equal(verifyPhpPassword("test-password", "Surname", hash), false);
  } finally {
    if (previous === undefined) delete process.env.PASSWORD_PEPPER;
    else process.env.PASSWORD_PEPPER = previous;
  }
});

test("new Attendance hashes are usable by Ajirmed and preserve password whitespace", () => {
  const password = " test-password ";
  const hash = hashPassword(password);
  assert.match(hash, /^\$2y\$/);
  assert.equal(bcrypt.compareSync(password, hash), true);
  assert.equal(verifyPhpPassword(password, "Surname", hash), true);
  assert.equal(verifyPhpPassword(password.trim(), "Surname", hash), false);
});
