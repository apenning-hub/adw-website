// Where the map page is allowed to exist.
//
// The rule that matters: `main` is what Cloudflare builds for production and
// pushing it publishes to the live site immediately. The map is not finished,
// so it must never appear there — but it does need to be shareable with
// someone, which is what preview branches are for.
//
// Run: npm test

const { test } = require("node:test");
const assert = require("node:assert");

const { shouldBuildMap } = require("../src/_data/env.js");

test("builds locally, where there is no Cloudflare at all", () => {
  assert.strictEqual(shouldBuildMap({ onCloudflare: false, branch: undefined }), true);
});

test("builds on a preview branch, so a dev URL can be shared", () => {
  assert.strictEqual(shouldBuildMap({ onCloudflare: true, branch: "2026-map" }), true);
});

test("NEVER builds on main", () => {
  // The live site. This is the assertion the whole arrangement exists for.
  assert.strictEqual(shouldBuildMap({ onCloudflare: true, branch: "main" }), false);
});

test("main can be overridden, but only deliberately", () => {
  assert.strictEqual(
    shouldBuildMap({ onCloudflare: true, branch: "main", override: "1" }), true);
});

test("an unset override does not count as an override", () => {
  for (const override of [undefined, "", "0", "false", "yes"]) {
    assert.strictEqual(
      shouldBuildMap({ onCloudflare: true, branch: "main", override }), false,
      `override=${JSON.stringify(override)} must not publish the map`);
  }
});

test("a branch that merely looks like main is still not main", () => {
  assert.strictEqual(shouldBuildMap({ onCloudflare: true, branch: "main-backup" }), true);
  assert.strictEqual(shouldBuildMap({ onCloudflare: true, branch: "mainline" }), true);
});
