import assert from "node:assert/strict";
import test from "node:test";
import { addItems, compactInventory, mergeStacks, splitStack } from "../src/index.js";

const limits = {
  arrow: 64,
  potion: 10,
  sword: 1
};

const item = { id: "arrow", count: 1 };
const stack = { id: "arrow", count: 1 };

function throws(fn, name, message) {
  assert.throws(fn, { name, message });
}

function eachOperation(inventory, limitMap, name, message) {
  throws(() => addItems(inventory, item, limitMap), name, message);
  throws(() => splitStack(inventory, 0, 1, limitMap), name, message);
  throws(() => mergeStacks(inventory, 0, 1, limitMap), name, message);
  throws(() => compactInventory(inventory, limitMap), name, message);
}

test("every operation requires an array inventory", () => {
  const values = [undefined, null, 0, "bag", { length: 1 }, true, false, 1n];
  for (const value of values) {
    eachOperation(value, limits, "TypeError", "inventory must be an array");
  }
});

test("every operation requires a limits object before it reads slots", () => {
  const values = [undefined, null, [], "arrow", 64, true, 1n];
  for (const value of values) {
    eachOperation([], value, "TypeError", "limits must be an object");
    eachOperation([stack], value, "TypeError", "limits must be an object");
  }
});

test("limit ids and values are validated in key order for every operation", () => {
  eachOperation([stack], { "": 1, arrow: 64 }, "TypeError", "limit id must be a non-empty string");
  eachOperation(
    [stack],
    { arrow: 0, "": 1 },
    "RangeError",
    "limit must be an integer greater than or equal to 1"
  );
  const badValues = [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "64",
    true,
    null,
    -0
  ];
  for (const value of badValues) {
    eachOperation(
      [],
      { arrow: value },
      "RangeError",
      "limit must be an integer greater than or equal to 1"
    );
  }
  eachOperation(
    [],
    { arrow: 1.5, potion: 0 },
    "RangeError",
    "limit must be an integer greater than or equal to 1"
  );
});

test("a bad slot is reported from the left before later slots or operation arguments", () => {
  const cases = [
    [[undefined], "TypeError", "slot must be null or a stack"],
    [[0], "TypeError", "slot must be null or a stack"],
    [["arrow"], "TypeError", "slot must be null or a stack"],
    [[["arrow", 1]], "TypeError", "slot must be null or a stack"],
    [[true], "TypeError", "slot must be null or a stack"],
    [[{}], "TypeError", "stack id must be a non-empty string"],
    [[{ count: 1 }], "TypeError", "stack id must be a non-empty string"],
    [[{ id: "", count: 1 }], "TypeError", "stack id must be a non-empty string"],
    [[{ id: 1, count: 1 }], "TypeError", "stack id must be a non-empty string"],
    [[{ id: null, count: 1 }], "TypeError", "stack id must be a non-empty string"],
    [[{ id: "arrow" }], "RangeError", "stack count must be an integer greater than or equal to 1"],
    [
      [{ id: "arrow", count: 0 }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: -1 }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: 1.5 }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: Number.NaN }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: Number.POSITIVE_INFINITY }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: "1" }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: true }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: null }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [
      [{ id: "arrow", count: -0 }],
      "RangeError",
      "stack count must be an integer greater than or equal to 1"
    ],
    [[{ id: "ghost", count: 1 }], "TypeError", "limit must be set for the item"],
    [[{ id: "arrow", count: 65 }], "RangeError", "stack count must not exceed the item limit"]
  ];
  for (const [inventory, name, message] of cases) {
    eachOperation(inventory, limits, name, message);
  }
  const sparse = [];
  sparse.length = 2;
  sparse[1] = { id: "arrow", count: 1 };
  eachOperation(sparse, limits, "TypeError", "slot must be null or a stack");
  const inherited = Object.create({ id: "arrow", count: 1 });
  eachOperation([inherited], limits, "TypeError", "stack id must be a non-empty string");
  eachOperation(
    [
      { id: "", count: 1 },
      { id: "arrow", count: 0 }
    ],
    limits,
    "TypeError",
    "stack id must be a non-empty string"
  );
  eachOperation(
    [
      { id: "arrow", count: 0 },
      { id: "missing", count: 1 }
    ],
    limits,
    "RangeError",
    "stack count must be an integer greater than or equal to 1"
  );
});

test("an unused invalid limit fails before a valid inventory is accepted", () => {
  throws(
    () => addItems([], item, { potion: Number.MAX_SAFE_INTEGER + 1 }),
    "RangeError",
    "limit must be an integer greater than or equal to 1"
  );
});

test("inherited and non-enumerable limits are not limits", () => {
  throws(
    () => addItems([], item, Object.create({ arrow: 64 })),
    "TypeError",
    "limit must be set for the item"
  );
  const hidden = {};
  Object.defineProperty(hidden, "arrow", { value: 64, enumerable: false });
  const packed = compactInventory([], hidden);
  assert.deepEqual(packed.slots, []);
  throws(() => addItems([], item, hidden), "TypeError", "limit must be set for the item");
  throws(
    () => compactInventory([{ id: "arrow", count: 1 }], hidden),
    "TypeError",
    "limit must be set for the item"
  );
});

test("add validates the item after the inventory and before the limits", () => {
  throws(() => addItems(null, null, null), "TypeError", "inventory must be an array");
  throws(() => addItems([], null, null), "TypeError", "item must be an object");
  throws(() => addItems([], [], { arrow: 64 }), "TypeError", "item must be an object");
  throws(() => addItems([], "arrow", { arrow: 64 }), "TypeError", "item must be an object");
  throws(() => addItems([], {}, { arrow: 64 }), "TypeError", "item id must be a non-empty string");
  throws(
    () => addItems([], { count: 1 }, { arrow: 64 }),
    "TypeError",
    "item id must be a non-empty string"
  );
  throws(
    () => addItems([], { id: "", count: 1 }, null),
    "TypeError",
    "item id must be a non-empty string"
  );
  throws(
    () => addItems([], { id: 1, count: 1 }, { arrow: 64 }),
    "TypeError",
    "item id must be a non-empty string"
  );
  throws(
    () => addItems([], { id: "arrow" }, { arrow: 64 }),
    "RangeError",
    "item count must be an integer greater than or equal to 1"
  );
  const badCounts = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1", true, null, -0, 1n];
  for (const count of badCounts) {
    throws(
      () => addItems([], { id: "arrow", count }, { arrow: 64 }),
      "RangeError",
      "item count must be an integer greater than or equal to 1"
    );
  }
  throws(
    () => addItems([], { id: "arrow", count: Number.MAX_SAFE_INTEGER + 1 }, { arrow: 1 }),
    "RangeError",
    "item count must be an integer greater than or equal to 1"
  );
  throws(
    () => addItems([], { id: "arrow", count: 1 }, {}),
    "TypeError",
    "limit must be set for the item"
  );
  throws(
    () => addItems([{ id: "potion", count: 1 }], { id: "arrow", count: 1 }, { potion: 10 }),
    "TypeError",
    "limit must be set for the item"
  );
  throws(
    () => addItems([{ id: "arrow", count: 99 }], { id: "", count: 1 }, limits),
    "TypeError",
    "item id must be a non-empty string"
  );
  throws(
    () => addItems([{ id: "arrow", count: 99 }], { id: "arrow", count: 1 }, limits),
    "RangeError",
    "stack count must not exceed the item limit"
  );
});

test("split validates the index only after the inventory is valid", () => {
  throws(
    () => splitStack([], 0, 1, {}),
    "RangeError",
    "index must be an integer inside the inventory"
  );
  const badIndexes = [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "0",
    1n,
    null,
    1,
    Number.MAX_SAFE_INTEGER
  ];
  for (const index of badIndexes) {
    throws(
      () => splitStack([stack], index, 1, limits),
      "RangeError",
      "index must be an integer inside the inventory"
    );
  }
  throws(() => splitStack([null], 0, "x", limits), "TypeError", "index must point at a stack");
  throws(
    () => splitStack([stack, null], 5, 0, limits),
    "RangeError",
    "index must be an integer inside the inventory"
  );
  const badCounts = [0, -1, 1.5, Number.NaN, 2, "1", null, 1n, Number.MAX_SAFE_INTEGER];
  for (const count of badCounts) {
    throws(
      () => splitStack([stack], 0, count, limits),
      "RangeError",
      "split count must be an integer from 1 through the stack count"
    );
  }
});

test("merge validates indexes, emptiness, and ids in that order", () => {
  throws(
    () => mergeStacks([stack], -1, 0, limits),
    "RangeError",
    "source index must be an integer inside the inventory"
  );
  throws(
    () => mergeStacks([stack, stack], 0, 2, limits),
    "RangeError",
    "target index must be an integer inside the inventory"
  );
  throws(
    () => mergeStacks([stack], "0", "1", limits),
    "RangeError",
    "source index must be an integer inside the inventory"
  );
  throws(() => mergeStacks([null], 0, 0, limits), "RangeError", "source and target must differ");
  throws(
    () => mergeStacks([stack, stack], -0, 0, limits),
    "RangeError",
    "source and target must differ"
  );
  throws(() => mergeStacks([null, stack], 0, 1, limits), "TypeError", "source must be a stack");
  throws(() => mergeStacks([stack, null], 0, 1, limits), "TypeError", "target must be a stack");
  throws(() => mergeStacks([null, null], 0, 1, limits), "TypeError", "source must be a stack");
  throws(
    () =>
      mergeStacks(
        [
          { id: "arrow", count: 1 },
          { id: "potion", count: 1 }
        ],
        0,
        1,
        limits
      ),
    "TypeError",
    "stacks must share an item id"
  );
  throws(
    () =>
      mergeStacks(
        [
          { id: "arrow", count: 1 },
          { id: "Arrow", count: 1 }
        ],
        0,
        1,
        { arrow: 10, Arrow: 10 }
      ),
    "TypeError",
    "stacks must share an item id"
  );
});

test("a count equal to the limit is a valid full stack", () => {
  const inventory = [
    { id: "arrow", count: 64 },
    { id: "sword", count: 1 }
  ];
  const added = addItems(inventory, { id: "potion", count: 1 }, limits);
  assert.equal(added.overflow, 1);
  const packed = compactInventory(inventory, limits);
  assert.deepEqual(packed.slots, inventory);
});

test("symbol keys on the limits object are ignored", () => {
  const id = Symbol("arrow");
  const map = { [id]: 64 };
  throws(() => addItems([], item, map), "TypeError", "limit must be set for the item");
});
