import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { addItems, compactInventory, mergeStacks, splitStack } from "../src/index.js";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), [
    "addItems",
    "compactInventory",
    "mergeStacks",
    "splitStack"
  ]);
  assert.equal(typeof api.addItems, "function");
  assert.equal(typeof api.compactInventory, "function");
  assert.equal(typeof api.mergeStacks, "function");
  assert.equal(typeof api.splitStack, "function");
  assert.equal(addItems, api.addItems);
  assert.equal(compactInventory, api.compactInventory);
  assert.equal(mergeStacks, api.mergeStacks);
  assert.equal(splitStack, api.splitStack);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/item-stack");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/item-stack.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  assert.equal(license.includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design notes",
    "## License"
  ]) {
    assert.equal(readme.includes(heading), true, heading);
  }
  assert.equal(readme.includes("`added.placed` is `100`. `added.overflow` is `0`."), true);
  assert.equal(readme.includes("`added.slots[2].count` is `62`."), true);
  assert.equal(readme.includes("`added.slots[3].count` is `64`."), true);
  assert.equal(readme.includes("`added.slots[5]` is `null`."), true);
  assert.equal(readme.includes("`potions.placed` is `20`. `potions.overflow` is `10`."), true);
  assert.equal(readme.includes("`potions.slots[5].count` is `10`."), true);
  assert.equal(readme.includes("`topUp.slots[0].count` is `6`."), true);
  assert.equal(readme.includes("`topUp.slots[1].count` is `64`."), true);
  assert.equal(readme.includes("`spread.slots[0].count` is `2`."), true);
  assert.equal(readme.includes("`spread.slots[2]` is `null`."), true);
  assert.equal(readme.includes("`taken.stack.count` is `20`."), true);
  assert.equal(readme.includes("`taken.slots[0].count` is `30`."), true);
  assert.equal(readme.includes("`merged.moved` is `14`."), true);
  assert.equal(readme.includes("`merged.slots[0].count` is `64`."), true);
  assert.equal(readme.includes("`merged.slots[3].count` is `26`."), true);
  assert.equal(readme.includes("`packed.slots[0].count` is `64`."), true);
  assert.equal(readme.includes("`packed.slots[2].count` is `36`."), true);
  assert.equal(readme.includes("`packed.slots[3].count` is `3`."), true);
  assert.equal(readme.includes("`packed.slots[5]` is `null`."), true);
  assert.equal(readme.includes("`kept.slots[2].count` is `1`."), true);
  assert.equal(readme.includes("`kept.slots[3]` is `null`."), true);
  assert.equal(readme.includes("`intoSecond.slots[0].count` is `36`."), true);
  assert.equal(readme.includes("`intoSecond.slots[1].count` is `64`."), true);
  assert.equal(readme.includes("`intoFirst.slots[0].count` is `64`."), true);
  assert.equal(readme.includes("`intoFirst.slots[1].count` is `36`."), true);
  const workflow = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.equal(workflow.includes("node-version: [20, 22]"), true);
  assert.equal(workflow.includes("npm ci"), true);
  assert.equal(workflow.includes("npm test"), true);
  assert.equal(workflow.includes("npm run lint"), true);
  assert.equal(workflow.includes("npm run format:check"), true);
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, [
    "add.js",
    "compact.js",
    "index.js",
    "merge.js",
    "read.js",
    "result.js",
    "shape.js",
    "split.js"
  ]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || !source.includes("import "), true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  assert.equal(text.includes("registry.yarnpkg.com"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
