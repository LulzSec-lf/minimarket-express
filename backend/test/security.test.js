const test = require("node:test");
const assert = require("node:assert/strict");
const { failedLoginState } = require("../src/utils/security");

test("increments failed login attempts before the fifth failure", () => {
    const result = failedLoginState(3);
    assert.equal(result.attempts, 4);
    assert.equal(result.blockedUntil, null);
});

test("blocks account on the fifth failure for fifteen minutes", () => {
    const before = Date.now() + 14 * 60 * 1000;
    const result = failedLoginState(4);
    assert.equal(result.attempts, 0);
    assert.ok(result.blockedUntil.getTime() > before);
});
