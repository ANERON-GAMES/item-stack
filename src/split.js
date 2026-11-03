import { assertInventory, readIndex, readLimits, readSlots, readSplitCount } from "./read.js";
import { freezeResult } from "./result.js";

const STACK_AT_INDEX_MESSAGE = "index must point at a stack";

export function splitStack(inventory, index, count, limits) {
  assertInventory(inventory);
  const limitMap = readLimits(limits);
  const slots = readSlots(inventory, limitMap);
  const slotIndex = readIndex(index, slots.length);
  const slot = slots[slotIndex];
  if (slot === null) {
    throw new TypeError(STACK_AT_INDEX_MESSAGE);
  }
  const taken = readSplitCount(count, slot.count);
  const id = slot.id;
  const left = slot.count - taken;
  if (left === 0) {
    slots[slotIndex] = null;
  } else {
    slot.count = left;
  }
  return freezeResult({
    slots,
    stack: { id, count: taken }
  });
}
