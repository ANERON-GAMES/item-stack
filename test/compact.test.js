import assert from "node:assert/strict";
import test from "node:test";
import { compactInventory } from "../src/index.js";

const limits = {
  arrow: 64,
  potion: 10,
  sword: 1
};

function loose() {
  return [
    { id: "arrow", count: 50 },
    null,
    { id: "potion", count: 4 },
    { id: "arrow", count: 40 },
    { id: "potion", count: 9 },
    null,
    { id: "sword", count: 1 },
    { id: "arrow", count: 10 }
  ];
}

test("compact fills earlier stacks, then closes gaps without sorting", () => {
  const inventory = loose();
  const packed = compactInventory(inventory, limits);
  assert.deepEqual(packed.slots, [
    { id: "arrow", count: 64 },
    { id: "potion", count: 10 },
    { id: "arrow", count: 36 },
    { id: "potion", count: 3 },
    { id: "sword", count: 1 },
    null,
    null,
    null
  ]);
  assert.deepEqual(Object.keys(packed), ["slots"]);
  assert.deepEqual(inventory, loose());
});

test("a remainder stays behind an item that sat between the stacks", () => {
  const kept = compactInventory(
    [
      { id: "arrow", count: 1 },
      { id: "potion", count: 1 },
      { id: "arrow", count: 1 },
      { id: "arrow", count: 1 }
    ],
    { arrow: 2, potion: 10 }
  );
  assert.deepEqual(kept.slots, [
    { id: "arrow", count: 2 },
    { id: "potion", count: 1 },
    { id: "arrow", count: 1 },
    null
  ]);
});

test("compact is idempotent", () => {
  const once = compactInventory(loose(), limits);
  const twice = compactInventory(once.slots, limits);
  assert.deepEqual(twice.slots, once.slots);
  assert.notEqual(twice.slots, once.slots);
  assert.notEqual(twice.slots[0], once.slots[0]);
});

test("empty slots stay empty and the length stays the same", () => {
  const packed = compactInventory([null, null, null], limits);
  assert.deepEqual(packed.slots, [null, null, null]);
  const single = compactInventory([{ id: "sword", count: 1 }], limits);
  assert.deepEqual(single.slots, [{ id: "sword", count: 1 }]);
});

test("holes between different items close without combining them", () => {
  const packed = compactInventory(
    [null, { id: "sword", count: 1 }, null, { id: "potion", count: 10 }],
    limits
  );
  assert.deepEqual(packed.slots, [
    { id: "sword", count: 1 },
    { id: "potion", count: 10 },
    null,
    null
  ]);
});

test("full stacks of the same item stay separate", () => {
  const packed = compactInventory(
    [
      { id: "sword", count: 1 },
      { id: "arrow", count: 10 },
      { id: "sword", count: 1 }
    ],
    limits
  );
  assert.deepEqual(packed.slots, [
    { id: "sword", count: 1 },
    { id: "arrow", count: 10 },
    { id: "sword", count: 1 }
  ]);
});

test("ids that differ by case or trailing space do not combine", () => {
  const packed = compactInventory(
    [{ id: "Arrow", count: 1 }, null, { id: "arrow", count: 1 }, { id: "arrow ", count: 1 }],
    { Arrow: 10, arrow: 10, "arrow ": 10 }
  );
  assert.deepEqual(packed.slots, [
    { id: "Arrow", count: 1 },
    { id: "arrow", count: 1 },
    { id: "arrow ", count: 1 },
    null
  ]);
});

test("an already packed inventory keeps its counts", () => {
  const inventory = [
    { id: "arrow", count: 64 },
    { id: "potion", count: 10 },
    { id: "arrow", count: 3 }
  ];
  const packed = compactInventory(inventory, limits);
  assert.deepEqual(packed.slots, inventory);
});

test("compact copies slots and freezes the result", () => {
  const slot = { id: "arrow", count: 4 };
  const inventory = [slot, null, { id: "arrow", count: 4 }];
  const packed = compactInventory(inventory, limits);
  slot.count = 1;
  inventory.push(null);
  assert.deepEqual(packed.slots, [{ id: "arrow", count: 8 }, null, null]);
  assert.equal(packed.slots.length, 3);
  assert.notEqual(packed.slots[0], slot);
  assert.equal(Object.isFrozen(packed), true);
  assert.equal(Object.isFrozen(packed.slots), true);
  assert.equal(Object.isFrozen(packed.slots[0]), true);
  const seen = new Set();
  for (const entry of packed.slots) {
    if (entry !== null) {
      assert.equal(seen.has(entry), false);
      seen.add(entry);
    }
  }
});

test("partial stacks combine across a full stack of another item", () => {
  const packed = compactInventory(
    [
      { id: "arrow", count: 4 },
      { id: "potion", count: 10 },
      { id: "arrow", count: 4 },
      { id: "arrow", count: 4 }
    ],
    { arrow: 5, potion: 10 }
  );
  assert.deepEqual(packed.slots, [
    { id: "arrow", count: 5 },
    { id: "potion", count: 10 },
    { id: "arrow", count: 5 },
    { id: "arrow", count: 2 }
  ]);
});
