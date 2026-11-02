import { isObject, normalizeZero } from "./shape.js";

const INVENTORY_MESSAGE = "inventory must be an array";
const LIMITS_MESSAGE = "limits must be an object";
const LIMIT_ID_MESSAGE = "limit id must be a non-empty string";
const LIMIT_MESSAGE = "limit must be an integer greater than or equal to 1";
const SLOT_MESSAGE = "slot must be null or a stack";
const STACK_ID_MESSAGE = "stack id must be a non-empty string";
const STACK_COUNT_MESSAGE = "stack count must be an integer greater than or equal to 1";
const STACK_LIMIT_MESSAGE = "stack count must not exceed the item limit";
const MISSING_LIMIT_MESSAGE = "limit must be set for the item";
const ITEM_MESSAGE = "item must be an object";
const ITEM_ID_MESSAGE = "item id must be a non-empty string";
const ITEM_COUNT_MESSAGE = "item count must be an integer greater than or equal to 1";
const INDEX_MESSAGE = "index must be an integer inside the inventory";
const SOURCE_INDEX_MESSAGE = "source index must be an integer inside the inventory";
const TARGET_INDEX_MESSAGE = "target index must be an integer inside the inventory";
const DISTINCT_MESSAGE = "source and target must differ";
const SOURCE_STACK_MESSAGE = "source must be a stack";
const TARGET_STACK_MESSAGE = "target must be a stack";
const SAME_ID_MESSAGE = "stacks must share an item id";
const SPLIT_COUNT_MESSAGE = "split count must be an integer from 1 through the stack count";

export function assertInventory(inventory) {
  if (!Array.isArray(inventory)) {
    throw new TypeError(INVENTORY_MESSAGE);
  }
}

export function readLimits(limits) {
  if (!isObject(limits)) {
    throw new TypeError(LIMITS_MESSAGE);
  }
  const map = Object.create(null);
  const keys = Object.keys(limits);
  for (const key of keys) {
    if (key.length === 0) {
      throw new TypeError(LIMIT_ID_MESSAGE);
    }
    const value = limits[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(LIMIT_MESSAGE);
    }
    map[key] = normalizeZero(value);
  }
  return map;
}

export function readSlots(inventory, limitMap) {
  const slots = [];
  for (let index = 0; index < inventory.length; index += 1) {
    if (!Object.hasOwn(inventory, index)) {
      throw new TypeError(SLOT_MESSAGE);
    }
    slots.push(readSlot(inventory[index], limitMap));
  }
  return slots;
}

export function readItem(item) {
  if (!isObject(item)) {
    throw new TypeError(ITEM_MESSAGE);
  }
  if (!Object.hasOwn(item, "id") || typeof item.id !== "string" || item.id.length === 0) {
    throw new TypeError(ITEM_ID_MESSAGE);
  }
  if (
    !Object.hasOwn(item, "count") ||
    typeof item.count !== "number" ||
    !Number.isSafeInteger(item.count) ||
    item.count < 1
  ) {
    throw new RangeError(ITEM_COUNT_MESSAGE);
  }
  return { id: item.id, count: normalizeZero(item.count) };
}

export function requireLimit(limitMap, id) {
  if (!Object.hasOwn(limitMap, id)) {
    throw new TypeError(MISSING_LIMIT_MESSAGE);
  }
  return limitMap[id];
}

export function readIndex(index, length) {
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= length) {
    throw new RangeError(INDEX_MESSAGE);
  }
  return normalizeZero(index);
}

export function readSourceIndex(index, length) {
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= length) {
    throw new RangeError(SOURCE_INDEX_MESSAGE);
  }
  return normalizeZero(index);
}

export function readTargetIndex(index, length) {
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= length) {
    throw new RangeError(TARGET_INDEX_MESSAGE);
  }
  return normalizeZero(index);
}

export function assertDistinct(sourceIndex, targetIndex) {
  if (sourceIndex === targetIndex) {
    throw new RangeError(DISTINCT_MESSAGE);
  }
}

export function assertMergeStacks(source, target) {
  if (source === null) {
    throw new TypeError(SOURCE_STACK_MESSAGE);
  }
  if (target === null) {
    throw new TypeError(TARGET_STACK_MESSAGE);
  }
  if (source.id !== target.id) {
    throw new TypeError(SAME_ID_MESSAGE);
  }
}

export function readSplitCount(count, available) {
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 || count > available) {
    throw new RangeError(SPLIT_COUNT_MESSAGE);
  }
  return normalizeZero(count);
}

function readSlot(slot, limitMap) {
  if (slot === null) {
    return null;
  }
  if (!isObject(slot)) {
    throw new TypeError(SLOT_MESSAGE);
  }
  if (!Object.hasOwn(slot, "id") || typeof slot.id !== "string" || slot.id.length === 0) {
    throw new TypeError(STACK_ID_MESSAGE);
  }
  if (
    !Object.hasOwn(slot, "count") ||
    typeof slot.count !== "number" ||
    !Number.isSafeInteger(slot.count) ||
    slot.count < 1
  ) {
    throw new RangeError(STACK_COUNT_MESSAGE);
  }
  const limit = requireLimit(limitMap, slot.id);
  const count = normalizeZero(slot.count);
  if (count > limit) {
    throw new RangeError(STACK_LIMIT_MESSAGE);
  }
  return { id: slot.id, count };
}
