import assert from "node:assert/strict";
import test from "node:test";
import { addItems } from "../src/index.js";

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

test("add fills earlier partial stacks before empty slots", () => {
  const inventory = bag();
  const added = addItems(inventory, { id: "arrow", count: 100 }, limits);
  assert.deepEqual(added.slots, [
    { id: "arrow", count: 64 },
    { id: "potion", count: 10 },
    { id: "arrow", count: 62 },
    { id: "arrow", count: 64 },
    { id: "sword", count: 1 },
    null
  ]);
  assert.equal(added.placed, 100);
  assert.equal(added.overflow, 0);
  assert.deepEqual(Object.keys(added), ["slots", "placed", "overflow"]);
  assert.deepEqual(inventory, bag());
});

test("add reports the overflow that does not fit", () => {
  const potions = addItems(bag(), { id: "potion", count: 30 }, limits);
  assert.deepEqual(potions.slots, [
    { id: "arrow", count: 50 },
    { id: "potion", count: 10 },
    { id: "potion", count: 10 },
    { id: "arrow", count: 40 },
    { id: "sword", count: 1 },
    { id: "potion", count: 10 }
  ]);
  assert.equal(potions.placed, 20);
  assert.equal(potions.overflow, 10);
});

test("an empty slot ahead of a partial stack stays empty until that partial is full", () => {
  const topUp = addItems([null, { id: "arrow", count: 60 }], { id: "arrow", count: 10 }, limits);
  assert.deepEqual(topUp.slots, [
    { id: "arrow", count: 6 },
    { id: "arrow", count: 64 }
  ]);
  assert.equal(topUp.placed, 10);
  assert.equal(topUp.overflow, 0);
});

test("the earliest partial stack absorbs the whole addition when it has room", () => {
  const spread = addItems(
    [{ id: "arrow", count: 1 }, { id: "arrow", count: 1 }, null],
    { id: "arrow", count: 1 },
    limits
  );
  assert.deepEqual(spread.slots, [{ id: "arrow", count: 2 }, { id: "arrow", count: 1 }, null]);
  assert.equal(spread.overflow, 0);
});

test("a full inventory returns the whole addition as overflow", () => {
  const full = addItems([{ id: "sword", count: 1 }], { id: "sword", count: 2 }, limits);
  assert.deepEqual(full.slots, [{ id: "sword", count: 1 }]);
  assert.equal(full.placed, 0);
  assert.equal(full.overflow, 2);
});

test("an empty inventory cannot place any items", () => {
  const empty = addItems([], { id: "arrow", count: 5 }, limits);
  assert.deepEqual(empty.slots, []);
  assert.equal(empty.placed, 0);
  assert.equal(empty.overflow, 5);
});

test("items that do not stack occupy one empty slot each", () => {
  const swords = addItems(
    [null, { id: "sword", count: 1 }, null, null],
    { id: "sword", count: 4 },
    limits
  );
  assert.deepEqual(swords.slots, [
    { id: "sword", count: 1 },
    { id: "sword", count: 1 },
    { id: "sword", count: 1 },
    { id: "sword", count: 1 }
  ]);
  assert.equal(swords.placed, 3);
  assert.equal(swords.overflow, 1);
});

test("different ids and spelling do not share a stack", () => {
  const added = addItems(
    [{ id: "Arrow", count: 1 }, { id: "arrow ", count: 1 }, null],
    { id: "arrow", count: 2 },
    { Arrow: 10, "arrow ": 10, arrow: 10 }
  );
  assert.deepEqual(added.slots, [
    { id: "Arrow", count: 1 },
    { id: "arrow ", count: 1 },
    { id: "arrow", count: 2 }
  ]);
});

test("a space is a distinct item id", () => {
  const added = addItems([null], { id: " ", count: 2 }, { " ": 5 });
  assert.deepEqual(added.slots, [{ id: " ", count: 2 }]);
});

test("extra fields on the item and the slots are not copied", () => {
  const slot = { id: "potion", count: 2, note: "keep" };
  const inventory = [slot, null];
  const added = addItems(inventory, { id: "arrow", count: 1, note: "drop" }, limits);
  assert.deepEqual(added.slots, [
    { id: "potion", count: 2 },
    { id: "arrow", count: 1 }
  ]);
  assert.equal(Object.hasOwn(added.slots[0], "note"), false);
  assert.equal(slot.note, "keep");
  assert.equal(slot.count, 2);
  assert.equal(inventory.length, 2);
});

test("the result is frozen and does not alias the input", () => {
  const slot = { id: "arrow", count: 50 };
  const inventory = [slot, null];
  const added = addItems(inventory, { id: "arrow", count: 5 }, limits);
  slot.count = 1;
  inventory[1] = { id: "arrow", count: 9 };
  assert.equal(added.slots[0].count, 55);
  assert.equal(added.slots[1], null);
  assert.notEqual(added.slots[0], slot);
  assert.equal(Object.isFrozen(added), true);
  assert.equal(Object.isFrozen(added.slots), true);
  assert.equal(Object.isFrozen(added.slots[0]), true);
  assert.throws(() => {
    added.slots[0].count = 1;
  }, TypeError);
  assert.throws(() => {
    added.slots.push(null);
  }, TypeError);
  assert.throws(() => {
    added.placed = 0;
  }, TypeError);
});

test("a frozen inventory can be passed into a later add", () => {
  const first = addItems([null, null], { id: "arrow", count: 1 }, limits);
  const second = addItems(first.slots, { id: "arrow", count: 4 }, limits);
  assert.deepEqual(second.slots, [{ id: "arrow", count: 5 }, null]);
  assert.equal(first.slots[0].count, 1);
});

test("two calls with the same input return equal values and distinct objects", () => {
  const inventory = bag();
  const first = addItems(inventory, { id: "arrow", count: 100 }, limits);
  const second = addItems(inventory, { id: "arrow", count: 100 }, limits);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.notEqual(first.slots, second.slots);
  assert.notEqual(first.slots[0], second.slots[0]);
});

test("limits are read from own properties and are not mutated", () => {
  const own = Object.create({ arrow: 1 });
  own.arrow = 64;
  const before = own.arrow;
  const added = addItems([{ id: "arrow", count: 60 }], { id: "arrow", count: 10 }, own);
  assert.equal(added.slots[0].count, 64);
  assert.equal(added.overflow, 6);
  assert.equal(own.arrow, before);
});

test("safe integer bounds are accepted when they fit", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const added = addItems(
    [{ id: "arrow", count: max - 1 }, null],
    { id: "arrow", count: 3 },
    {
      arrow: max
    }
  );
  assert.deepEqual(added.slots, [
    { id: "arrow", count: max },
    { id: "arrow", count: 2 }
  ]);
  assert.equal(added.placed, 3);
  assert.equal(added.overflow, 0);
});

test("an addition of the maximum safe integer overflows a full stack", () => {
  const max = Number.MAX_SAFE_INTEGER;
  const added = addItems(
    [{ id: "arrow", count: max }],
    { id: "arrow", count: max },
    { arrow: max }
  );
  assert.equal(added.placed, 0);
  assert.equal(added.overflow, max);
  assert.equal(added.slots[0].count, max);
});

test("labels on the inventory array are ignored", () => {
  const inventory = [{ id: "arrow", count: 1 }];
  inventory.label = "bag";
  const added = addItems(inventory, { id: "arrow", count: 1 }, limits);
  assert.deepEqual(added.slots, [{ id: "arrow", count: 2 }]);
  assert.equal(Object.hasOwn(added.slots, "label"), false);
  assert.equal(inventory.label, "bag");
});
