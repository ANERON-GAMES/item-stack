import {
  assertDistinct,
  assertInventory,
  assertMergeStacks,
  readLimits,
  readSlots,
  readSourceIndex,
  readTargetIndex
} from "./read.js";
import { freezeResult } from "./result.js";

export function mergeStacks(inventory, sourceIndex, targetIndex, limits) {
  assertInventory(inventory);
  const limitMap = readLimits(limits);
  const slots = readSlots(inventory, limitMap);
  const sourceAt = readSourceIndex(sourceIndex, slots.length);
  const targetAt = readTargetIndex(targetIndex, slots.length);
  assertDistinct(sourceAt, targetAt);
  const source = slots[sourceAt];
  const target = slots[targetAt];
  assertMergeStacks(source, target);
  const space = limitMap[source.id] - target.count;
  const moved = space <= 0 ? 0 : source.count < space ? source.count : space;
  if (moved > 0) {
    target.count += moved;
    const left = source.count - moved;
    if (left === 0) {
      slots[sourceAt] = null;
    } else {
      source.count = left;
    }
  }
  return freezeResult({
    slots,
    moved
  });
}
