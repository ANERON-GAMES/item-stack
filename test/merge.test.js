import assert from "node:assert/strict";
import test from "node:test";
import { mergeStacks } from "../src/index.js";

const limits = {
  arrow: 64,
  potion: 10,
  sword: 1
};

function bag() {
  return [
    { id: "arrow", count: 50 },
    { id: "potion", count: 10 },
    null,
    { id: "arrow", count: 40 },
    { id: "sword", count: 1 },
    null
  ];
}

test("merge pours from the source into the target up to the limit", () => {
  const inventory = bag();
  const merged = mergeStacks(inventory, 3, 0, limits);
  assert.equal(merged.moved, 14);
  assert.deepEqual(merged.slots, [
    { id: "arrow", count: 64 },
    { id: "potion", count: 10 },
    null,
    { id: "arrow", count: 26 },
    { id: "sword", count: 1 },
    null
  ]);
  assert.deepEqual(Object.keys(merged), ["slots", "moved"]);
  assert.deepEqual(inventory, bag());
});

test("the source slot becomes empty when it pours completely", () => {
  const merged = mergeStacks(
    [
      { id: "arrow", count: 10 },
      { id: "arrow", count: 20 }
    ],
    0,
    1,
    limits
  );
  assert.equal(merged.moved, 10);
  assert.deepEqual(merged.slots, [null, { id: "arrow", count: 30 }]);
});

test("merge is directional", () => {
  const inventory = [
    { id: "arrow", count: 50 },
    { id: "arrow", count: 50 }
  ];
  const intoSecond = mergeStacks(inventory, 0, 1, limits);
  const intoFirst = mergeStacks(inventory, 1, 0, limits);
  assert.equal(intoSecond.moved, 14);
  assert.equal(intoSecond.slots[0].count, 36);
  assert.equal(intoSecond.slots[1].count, 64);
  assert.equal(intoFirst.moved, 14);
  assert.equal(intoFirst.slots[0].count, 64);
  assert.equal(intoFirst.slots[1].count, 36);
});

test("a full target moves nothing", () => {
  const inventory = [
    { id: "potion", count: 4 },
    { id: "potion", count: 10 }
  ];
  const merged = mergeStacks(inventory, 0, 1, limits);
  assert.equal(merged.moved, 0);
  assert.deepEqual(merged.slots, inventory);
  assert.notEqual(merged.slots[0], inventory[0]);
  assert.notEqual(merged.slots[1], inventory[1]);
});

test("a later source can pour into an earlier target", () => {
  const merged = mergeStacks(
    [
      { id: "arrow", count: 10 },
      { id: "potion", count: 2 },
      { id: "arrow", count: 50 }
    ],
    2,
    0,
    limits
  );
  assert.equal(merged.moved, 50);
  assert.deepEqual(merged.slots, [{ id: "arrow", count: 60 }, { id: "potion", count: 2 }, null]);
});

test("negative zero indexes the first slot", () => {
  const merged = mergeStacks(
    [
      { id: "arrow", count: 1 },
      { id: "arrow", count: 1 }
    ],
    -0,
    1,
    limits
  );
  assert.deepEqual(merged.slots, [null, { id: "arrow", count: 2 }]);
});

test("merge copies every slot and freezes the result", () => {
  const source = { id: "arrow", count: 5 };
  const target = { id: "arrow", count: 5 };
  const other = { id: "sword", count: 1 };
  const inventory = [source, other, target];
  const merged = mergeStacks(inventory, 0, 2, limits);
  source.count = 9;
  assert.equal(merged.moved, 5);
  assert.equal(merged.slots[2].count, 10);
  assert.equal(merged.slots[0], null);
  assert.deepEqual(merged.slots[1], { id: "sword", count: 1 });
  assert.notEqual(merged.slots[1], other);
  assert.equal(Object.isFrozen(merged), true);
  assert.equal(Object.isFrozen(merged.slots), true);
  assert.equal(Object.isFrozen(merged.slots[1]), true);
  assert.equal(Object.isFrozen(merged.slots[2]), true);
});

test("two merges do not share result objects", () => {
  const inventory = [
    { id: "arrow", count: 3 },
    { id: "arrow", count: 4 }
  ];
  const first = mergeStacks(inventory, 0, 1, limits);
  const second = mergeStacks(inventory, 0, 1, limits);
  assert.deepEqual(first, second);
  assert.notEqual(first.slots[1], second.slots[1]);
});

test("stacks of one do not combine", () => {
  const merged = mergeStacks(
    [
      { id: "sword", count: 1 },
      { id: "sword", count: 1 }
    ],
    0,
    1,
    limits
  );
  assert.equal(merged.moved, 0);
  assert.deepEqual(merged.slots, [
    { id: "sword", count: 1 },
    { id: "sword", count: 1 }
  ]);
});
