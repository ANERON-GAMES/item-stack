export function freezeResult(result) {
  const slots = result.slots;
  for (const slot of slots) {
    if (slot !== null) {
      Object.freeze(slot);
    }
  }
  Object.freeze(slots);
  if (Object.hasOwn(result, "stack")) {
    Object.freeze(result.stack);
  }
  return Object.freeze(result);
}
