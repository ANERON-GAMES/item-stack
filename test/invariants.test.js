import assert from "node:assert/strict";
import test from "node:test";
import { addItems, compactInventory, mergeStacks, splitStack } from "../src/index.js";

function cloneSlot(slot) {
  if (slot === null) {
    return null;
  }
  return { id: slot.id, count: slot.count };
}

function cloneInventory(inventory) {
  return inventory.map(cloneSlot);
}

function generate(limit, length, ids) {
  const choices = [null];
  for (const id of ids) {
    for (let count = 1; count <= limit; count += 1) {
      choices.push({ id, count });
    }
  }
  const inventories = [];
  const total = choices.length ** length;
  for (let mask = 0; mask < total; mask += 1) {
    const slots = [];
    let value = mask;
    for (let index = 0; index < length; index += 1) {
      slots.push(cloneSlot(choices[value % choices.length]));
      value = Math.floor(value / choices.length);
    }
    inventories.push(slots);
  }
  return inventories;
}

function roomFor(inventory, id, limit) {
  let room = 0;
  for (const slot of inventory) {
    if (slot === null) {
      room += limit;
    } else if (slot.id === id) {
      room += limit - slot.count;
    }
  }
  return room;
}

function sumOf(inventory, id) {
  let total = 0;
  for (const slot of inventory) {
    if (slot !== null && slot.id === id) {
      total += slot.count;
    }
  }
  return total;
}

function expectedAdd(inventory, id, count, limit) {
  const slots = cloneInventory(inventory);
  let remaining = count;
  for (const slot of slots) {
    if (slot === null || slot.id !== id) {
      continue;
    }
    const space = limit - slot.count;
    if (space <= 0) {
      continue;
    }
    const moved = space < remaining ? space : remaining;
    slot.count += moved;
    remaining -= moved;
    if (remaining === 0) {
      break;
    }
  }
  if (remaining > 0) {
    for (let index = 0; index < slots.length; index += 1) {
      if (slots[index] !== null) {
        continue;
      }
      const placedHere = limit < remaining ? limit : remaining;
      slots[index] = { id, count: placedHere };
      remaining -= placedHere;
      if (remaining === 0) {
        break;
      }
    }
  }
  return {
    slots,
    placed: count - remaining,
    overflow: remaining
  };
}

function expectedCompact(inventory, limitOf) {
  const groups = new Map();
  const order = [];
  for (const slot of inventory) {
    if (slot === null) {
      continue;
    }
    if (!groups.has(slot.id)) {
      groups.set(slot.id, []);
      order.push(slot.id);
    }
    groups.get(slot.id).push(slot.count);
  }
  const keptCounts = new Map();
  for (const id of order) {
    let total = 0;
    const counts = groups.get(id);
    for (const count of counts) {
      total += count;
    }
    const limit = limitOf(id);
    const need = Math.ceil(total / limit);
    const out = [];
    let left = total;
    for (let index = 0; index < need; index += 1) {
      const count = left < limit ? left : limit;
      out.push(count);
      left -= count;
    }
    keptCounts.set(id, out);
  }
  const result = [];
  const used = new Map();
  for (const slot of inventory) {
    if (slot === null) {
      continue;
    }
    const list = keptCounts.get(slot.id);
    const seen = used.get(slot.id) ?? 0;
    if (seen < list.length) {
      result.push({ id: slot.id, count: list[seen] });
      used.set(slot.id, seen + 1);
    }
  }
  while (result.length < inventory.length) {
    result.push(null);
  }
  return result;
}

function assertFrozenSlots(slots) {
  assert.equal(Object.isFrozen(slots), true);
  for (const slot of slots) {
    if (slot !== null) {
      assert.equal(Object.isFrozen(slot), true);
      assert.equal(slot.count >= 1, true);
    }
  }
}

test("add keeps an independent room formula and fill order across small inventories", () => {
  const ids = ["arrow"];
  for (let limit = 1; limit <= 4; limit += 1) {
    const limitMap = { arrow: limit };
    for (let length = 0; length <= 4; length += 1) {
      for (const inventory of generate(limit, length, ids)) {
        const before = JSON.stringify(inventory);
        const room = roomFor(inventory, "arrow", limit);
        const maxCount = limit * length + 1;
        for (let count = 1; count <= maxCount; count += 1) {
          const result = addItems(inventory, { id: "arrow", count }, limitMap);
          const expected = expectedAdd(inventory, "arrow", count, limit);
          const label = JSON.stringify({ inventory, count, limit });
          assert.deepEqual(result.slots, expected.slots, label);
          assert.equal(result.placed, Math.min(count, room), label);
          assert.equal(result.overflow, count - result.placed, label);
          assert.equal(result.placed + result.overflow, count, label);
          assert.equal(
            sumOf(result.slots, "arrow"),
            sumOf(inventory, "arrow") + result.placed,
            label
          );
          assert.equal(result.slots.length, inventory.length, label);
          assert.equal(JSON.stringify(inventory), before, label);
          assert.equal(Object.isFrozen(result), true);
          if (result.overflow > 0) {
            assert.equal(roomFor(result.slots, "arrow", limit), 0, label);
          }
        }
      }
    }
  }
});

test("add does not change stacks of another item", () => {
  const limitMap = { arrow: 3, potion: 3 };
  for (let length = 0; length <= 3; length += 1) {
    for (const inventory of generate(3, length, ["arrow", "potion"])) {
      const before = JSON.stringify(inventory);
      for (let count = 1; count <= 10; count += 1) {
        const result = addItems(inventory, { id: "arrow", count }, limitMap);
        for (let index = 0; index < inventory.length; index += 1) {
          const original = inventory[index];
          if (original !== null && original.id === "potion") {
            assert.deepEqual(result.slots[index], original);
          }
        }
        assert.equal(sumOf(result.slots, "potion"), sumOf(inventory, "potion"));
        assert.equal(JSON.stringify(inventory), before);
        assertFrozenSlots(result.slots);
      }
    }
  }
});

test("compact matches leftmost redistribution and is idempotent", () => {
  for (let limit = 1; limit <= 3; limit += 1) {
    const limitMap = { arrow: limit, potion: limit };
    const limitOf = () => limit;
    for (let length = 0; length <= 3; length += 1) {
      for (const inventory of generate(limit, length, ["arrow", "potion"])) {
        const before = JSON.stringify(inventory);
        const result = compactInventory(inventory, limitMap);
        const label = JSON.stringify({ inventory, limit });
        assert.deepEqual(result.slots, expectedCompact(inventory, limitOf), label);
        assert.equal(sumOf(result.slots, "arrow"), sumOf(inventory, "arrow"), label);
        assert.equal(sumOf(result.slots, "potion"), sumOf(inventory, "potion"), label);
        assert.equal(result.slots.length, inventory.length, label);
        let seenNull = false;
        for (const slot of result.slots) {
          if (slot === null) {
            seenNull = true;
          } else {
            assert.equal(seenNull, false, label);
            assert.equal(slot.count <= limit, true, label);
          }
        }
        const again = compactInventory(result.slots, limitMap);
        assert.deepEqual(again.slots, result.slots, label);
        assert.equal(JSON.stringify(inventory), before, label);
        assert.equal(Object.isFrozen(result), true);
      }
    }
  }
});

test("split conserves the stack and leaves every other slot in place", () => {
  const limitMap = { arrow: 4, potion: 4 };
  for (let length = 1; length <= 3; length += 1) {
    for (const inventory of generate(4, length, ["arrow", "potion"])) {
      const before = JSON.stringify(inventory);
      for (let index = 0; index < inventory.length; index += 1) {
        const slot = inventory[index];
        if (slot === null) {
          continue;
        }
        for (let count = 1; count <= slot.count; count += 1) {
          const result = splitStack(inventory, index, count, limitMap);
          assert.deepEqual(result.stack, { id: slot.id, count });
          assert.equal(result.slots.length, inventory.length);
          for (let other = 0; other < inventory.length; other += 1) {
            if (other === index) {
              continue;
            }
            assert.deepEqual(result.slots[other], inventory[other]);
          }
          if (count === slot.count) {
            assert.equal(result.slots[index], null);
          } else {
            assert.deepEqual(result.slots[index], { id: slot.id, count: slot.count - count });
          }
          assert.equal(Object.isFrozen(result.stack), true);
          assert.equal(JSON.stringify(inventory), before);
        }
      }
    }
  }
});

test("merge conserves items and moves only what the target can hold", () => {
  const limitMap = { arrow: 3, potion: 3 };
  for (let length = 2; length <= 3; length += 1) {
    for (const inventory of generate(3, length, ["arrow", "potion"])) {
      const before = JSON.stringify(inventory);
      for (let source = 0; source < length; source += 1) {
        for (let target = 0; target < length; target += 1) {
          const sourceSlot = inventory[source];
          const targetSlot = inventory[target];
          if (source === target || sourceSlot === null || targetSlot === null) {
            continue;
          }
          if (sourceSlot.id !== targetSlot.id) {
            assert.throws(() => mergeStacks(inventory, source, target, limitMap), {
              name: "TypeError",
              message: "stacks must share an item id"
            });
            continue;
          }
          const result = mergeStacks(inventory, source, target, limitMap);
          const space = 3 - targetSlot.count;
          const moved = space <= 0 ? 0 : Math.min(sourceSlot.count, space);
          assert.equal(result.moved, moved);
          assert.equal(sumOf(result.slots, sourceSlot.id), sumOf(inventory, sourceSlot.id));
          for (let index = 0; index < length; index += 1) {
            if (index !== source && index !== target) {
              assert.deepEqual(result.slots[index], inventory[index]);
            }
          }
          if (moved === sourceSlot.count) {
            assert.equal(result.slots[source], null);
          } else {
            assert.deepEqual(result.slots[source], {
              id: sourceSlot.id,
              count: sourceSlot.count - moved
            });
          }
          assert.deepEqual(result.slots[target], {
            id: targetSlot.id,
            count: targetSlot.count + moved
          });
          assert.equal(JSON.stringify(inventory), before);
          assert.equal(Object.isFrozen(result), true);
        }
      }
    }
  }
});
