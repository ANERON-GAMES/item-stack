import { assertInventory, readItem, readLimits, readSlots, requireLimit } from "./read.js";
import { freezeResult } from "./result.js";

export function addItems(inventory, item, limits) {
  assertInventory(inventory);
  const addition = readItem(item);
  const limitMap = readLimits(limits);
  const slots = readSlots(inventory, limitMap);
  const limit = requireLimit(limitMap, addition.id);
  let remaining = addition.count;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (slot === null || slot.id !== addition.id) {
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
      slots[index] = { id: addition.id, count: placedHere };
      remaining -= placedHere;
      if (remaining === 0) {
        break;
      }
    }
  }
  return freezeResult({
    slots,
    placed: addition.count - remaining,
    overflow: remaining
  });
}
