import assert from "node:assert/strict";
import test from "node:test";
import { addItems, splitStack } from "../src/index.js";

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

test("split removes a count from one stack and returns that piece", () => {
  const inventory = bag();
  const taken = splitStack(inventory, 0, 20, limits);
  assert.deepEqual(taken.stack, { id: "arrow", count: 20 });
  assert.deepEqual(taken.slots, [
    { id: "arrow", count: 30 },
    { id: "potion", count: 10 },
    null,
    { id: "arrow", count: 40 },
    { id: "sword", count: 1 },
    null
  ]);
  assert.deepEqual(Object.keys(taken), ["slots", "stack"]);
  assert.deepEqual(inventory, bag());
});

test("splitting the whole stack clears the slot", () => {
  const taken = splitStack(bag(), 4, 1, limits);
  assert.deepEqual(taken.stack, { id: "sword", count: 1 });
  assert.equal(taken.slots[4], null);
  assert.equal(taken.slots[0].count, 50);
  assert.equal(taken.slots[1].count, 10);
});

test("splitting one from a stack of one clears the slot", () => {
  const taken = splitStack([{ id: "potion", count: 1 }], 0, 1, { potion: 10 });
  assert.deepEqual(taken.slots, [null]);
  assert.deepEqual(taken.stack, { id: "potion", count: 1 });
});

test("a split piece can be added back into the stack it left", () => {
  const inventory = [{ id: "arrow", count: 20 }, { id: "arrow", count: 5 }, null];
  const taken = splitStack(inventory, 0, 10, limits);
  assert.deepEqual(taken.slots, [{ id: "arrow", count: 10 }, { id: "arrow", count: 5 }, null]);
  const back = addItems(taken.slots, taken.stack, limits);
  assert.deepEqual(back.slots, inventory);
  assert.equal(back.placed, 10);
  assert.equal(back.overflow, 0);
});

test("negative zero is the first slot", () => {
  const taken = splitStack(
    [
      { id: "arrow", count: 4 },
      { id: "potion", count: 2 }
    ],
    -0,
    1,
    limits
  );
  assert.equal(taken.slots[0].count, 3);
  assert.equal(taken.slots[1].count, 2);
  assert.equal(taken.stack.count, 1);
});

test("the returned stack and the inventory are frozen copies", () => {
  const slot = { id: "arrow", count: 8 };
  const inventory = [null, slot];
  const taken = splitStack(inventory, 1, 3, limits);
  slot.count = 1;
  assert.equal(taken.slots[1].count, 5);
  assert.equal(taken.stack.count, 3);
  assert.notEqual(taken.slots[1], slot);
  assert.equal(Object.isFrozen(taken), true);
  assert.equal(Object.isFrozen(taken.slots), true);
  assert.equal(Object.isFrozen(taken.slots[1]), true);
  assert.equal(Object.isFrozen(taken.stack), true);
  assert.throws(() => {
    taken.stack.count = 1;
  }, TypeError);
});

test("two splits of the same stack return distinct objects", () => {
  const inventory = [{ id: "arrow", count: 9 }];
  const first = splitStack(inventory, 0, 4, limits);
  const second = splitStack(inventory, 0, 4, limits);
  assert.deepEqual(first, second);
  assert.notEqual(first.stack, second.stack);
  assert.notEqual(first.slots[0], second.slots[0]);
});

test("a count of one integer is a safe split", () => {
  const taken = splitStack([{ id: "arrow", count: 2 }], 0.0, 1.0, limits);
  assert.deepEqual(taken.slots, [{ id: "arrow", count: 1 }]);
  assert.deepEqual(taken.stack, { id: "arrow", count: 1 });
});
