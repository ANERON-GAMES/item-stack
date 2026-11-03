import { assertInventory, readLimits, readSlots } from "./read.js";
import { freezeResult } from "./result.js";

export function compactInventory(inventory, limits) {
  assertInventory(inventory);
  const limitMap = readLimits(limits);
  const slots = readSlots(inventory, limitMap);
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (slot === null) {
      continue;
    }
    const limit = limitMap[slot.id];
    for (let later = index + 1; later < slots.length; later += 1) {
      const other = slots[later];
      if (other === null || other.id !== slot.id) {
        continue;
      }
      const space = limit - slot.count;
      if (space <= 0) {
        break;
      }
      const moved = other.count < space ? other.count : space;
      slot.count += moved;
      const left = other.count - moved;
      if (left === 0) {
        slots[later] = null;
      } else {
        other.count = left;
      }
    }
  }
  let write = 0;
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index] !== null) {
      slots[write] = slots[index];
      write += 1;
    }
  }
  for (let index = write; index < slots.length; index += 1) {
    slots[index] = null;
  }
  return freezeResult({ slots });
}
