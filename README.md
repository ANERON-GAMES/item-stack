# @aneron/item-stack

Merge and split inventory stacks with a limit per item, and report what did not fit.

## Purpose

`@aneron/item-stack` updates one fixed list of inventory slots. A slot is empty (`null`) or a stack (`{ id, count }`). Each item id has its own stack limit. Adding items fills existing stacks of that id that are still below the limit, from the lowest index to the highest, and only then occupies empty slots. Anything that still does not fit is returned as overflow. Splitting takes a count off one stack. Merging pours one stack into another of the same id, up to that limit. Compacting pours later stacks into earlier stacks of the same id, then slides the remaining stacks toward index 0.

The length of the inventory does not change. A full bag stays full, and the overflow says what was left in hand. The module does not mutate its arguments. It does not read a clock, start a timer, draw a random number, or open a socket. It has no runtime dependencies.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/item-stack`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/item-stack.git
cd item-stack
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier. The repository workflow runs those three checks on Node.js 20 and Node.js 22.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/item-stack
```

```js
import { addItems, compactInventory, mergeStacks, splitStack } from "@aneron/item-stack";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

Limits below are stack maximums chosen by the caller. Arrows stack to 64, potions stack to 10, and a sword does not stack.

```js
import { addItems, compactInventory, mergeStacks, splitStack } from "@aneron/item-stack";

const limits = {
  arrow: 64,
  potion: 10,
  sword: 1
};

const bag = [
  { id: "arrow", count: 50 },
  { id: "potion", count: 10 },
  null,
  { id: "arrow", count: 40 },
  { id: "sword", count: 1 },
  null
];

const added = addItems(bag, { id: "arrow", count: 100 }, limits);
const potions = addItems(bag, { id: "potion", count: 30 }, limits);
const topUp = addItems([null, { id: "arrow", count: 60 }], { id: "arrow", count: 10 }, limits);
const spread = addItems(
  [{ id: "arrow", count: 1 }, { id: "arrow", count: 1 }, null],
  { id: "arrow", count: 1 },
  limits
);
const taken = splitStack(bag, 0, 20, limits);
const merged = mergeStacks(bag, 3, 0, limits);

const loose = [
  { id: "arrow", count: 50 },
  null,
  { id: "potion", count: 4 },
  { id: "arrow", count: 40 },
  { id: "potion", count: 9 },
  null,
  { id: "sword", count: 1 },
  { id: "arrow", count: 10 }
];
const packed = compactInventory(loose, limits);
const kept = compactInventory(
  [
    { id: "arrow", count: 1 },
    { id: "potion", count: 1 },
    { id: "arrow", count: 1 },
    { id: "arrow", count: 1 }
  ],
  { arrow: 2, potion: 10 }
);

const halves = [
  { id: "arrow", count: 50 },
  { id: "arrow", count: 50 }
];
const intoSecond = mergeStacks(halves, 0, 1, limits);
const intoFirst = mergeStacks(halves, 1, 0, limits);
```

`added.placed` is `100`. `added.overflow` is `0`. The open stack of 50 takes 14 and the stack of 40 takes 24. Both are then full. The remaining 62 arrows occupy the empty slot at index 2, ahead of the stack that was already at index 3. `added.slots[2].count` is `62`. `added.slots[3].count` is `64`. `added.slots[5]` is `null`. The sword and the full potion stack stay where they were.

`potions.placed` is `20`. `potions.overflow` is `10`. The potion stack is already at 10, so the two empty slots each receive a new stack of 10 and the last 10 potions do not fit. `potions.slots[5].count` is `10`.

`topUp.slots[0].count` is `6`. `topUp.slots[1].count` is `64`. The empty slot is first, and it still waits until the partial stack of 60 has taken 4. `spread.slots[0].count` is `2`. `spread.slots[2]` is `null`. One added arrow fills the earliest partial stack and does not open the empty slot.

`taken.stack.count` is `20`. `taken.slots[0].count` is `30`. The other slots are unchanged. `merged.moved` is `14`. `merged.slots[0].count` is `64`. `merged.slots[3].count` is `26`. Index 3 is the source and index 0 is the target.

`packed.slots[0].count` is `64`. `packed.slots[2].count` is `36`. `packed.slots[3].count` is `3`. `packed.slots[5]` is `null`. Arrows total 100, so they become a full stack and a remainder of 36. Potions total 13, so they become a full stack and a remainder of 3. The remainder of arrows stays behind the first potion stack, because that potion already sat between the arrow stacks. Empty slots move to the end. The length stays 8.

`kept.slots[2].count` is `1`. `kept.slots[3]` is `null`. With a limit of 2, the first arrow stack absorbs one later arrow and the leftover arrow stays after the potion.

`intoSecond.slots[0].count` is `36`. `intoSecond.slots[1].count` is `64`. `intoFirst.slots[0].count` is `64`. `intoFirst.slots[1].count` is `36`. Merge pours in one direction. The target is the stack that becomes full.

## API

All four functions are pure. They copy every slot they return. They do not mutate the inventory, the item, the indexes, or the limits object. Returned objects and arrays are frozen, including each stack. A frozen result can be passed back in as the next inventory.

An inventory is an array. The length is the number of slots and does not change. Index 0 is the first slot. A hole is not an empty slot. An empty slot is `null`. A stack is a non-array object with own properties `id` and `count`.

| Field   | Type   | Rule                                                                                             |
| ------- | ------ | ------------------------------------------------------------------------------------------------ |
| `id`    | string | Non-empty. `"arrow"` and `"Arrow"` are different items. `" "` is an id. The text is not trimmed. |
| `count` | number | A safe integer greater than or equal to 1, and less than or equal to that id's limit.            |

Extra own properties on a stack or on an added item are ignored. They are not copied onto the result.

`limits` is a non-array object. Only its own enumerable string keys are read. Each key is an item id and must be non-empty. Each value is a safe integer greater than or equal to 1. Keys are validated in enumeration order, and the first problem is the error. A key that no slot uses is still validated. Symbol keys are ignored. A limit inherited from the prototype is ignored. A non-enumerable own property is ignored. A `Map` has no enumerable string keys, so it does not supply limits.

Every id that appears in the inventory must have a limit. `addItems` also requires a limit for the id being added. A stack whose count is already above its limit is an error on every function. Compact does not repair an illegal stack.

`-0` is a safe integer and it is equal to `0`, so it is rejected anywhere a count or a limit must be at least 1. As an index, `-0` selects slot 0.

### `addItems(inventory, item, limits)`

Place `item.count` units of `item.id` into the inventory.

| Argument    | Type   | Role                                         |
| ----------- | ------ | -------------------------------------------- |
| `inventory` | array  | Slots, empty or stacked.                     |
| `item`      | object | `{ id, count }`. `count` is how many to add. |
| `limits`    | object | Stack limit per item id.                     |

The return value is `{ slots, placed, overflow }`.

| Field      | Type   | Meaning                                                              |
| ---------- | ------ | -------------------------------------------------------------------- |
| `slots`    | array  | The next inventory. Same length as the input.                        |
| `placed`   | number | How many units were placed.                                          |
| `overflow` | number | How many units did not fit. `placed + overflow` equals `item.count`. |

`overflow` is `0` when everything fits. It equals `item.count` when nothing fits, including when the inventory is empty.

Placement order:

1. Walk the slots from index 0. A stack of the same id with room takes `min(room, remaining)`. A full stack is skipped. A different id is skipped. An empty slot is skipped in this pass.
2. If units remain, walk from index 0 again. Each empty slot becomes a new stack of that id with `min(limit, remaining)`.
3. Units still remaining are `overflow`.

The earliest partial stack is filled before a later partial stack. An empty slot is not used while any stack of that id has room, even when the empty slot has a lower index. Adding does not reorder other items. It does not spread one addition evenly across partial stacks.

### `splitStack(inventory, index, count, limits)`

Remove `count` from the stack at `index` and return that piece. The piece is not placed into another slot.

| Argument    | Type   | Role                                            |
| ----------- | ------ | ----------------------------------------------- |
| `inventory` | array  | Slots.                                          |
| `index`     | number | Safe integer index of the stack to split.       |
| `count`     | number | Safe integer from 1 through that stack's count. |
| `limits`    | object | Stack limit per item id.                        |

The return value is `{ slots, stack }`.

| Field   | Type   | Meaning                                                                                                 |
| ------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `slots` | array  | The next inventory. The chosen slot holds the leftover count, or `null` when the whole stack was taken. |
| `stack` | object | `{ id, count }` for the piece that was removed.                                                         |

Other slots keep their id and count. Splitting does not look for an empty destination. Pass `stack` to `addItems` to put the piece somewhere else.

### `mergeStacks(inventory, sourceIndex, targetIndex, limits)`

Pour the source stack into the target stack.

| Argument      | Type   | Role                       |
| ------------- | ------ | -------------------------- |
| `inventory`   | array  | Slots.                     |
| `sourceIndex` | number | Stack that loses units.    |
| `targetIndex` | number | Stack that receives units. |
| `limits`      | object | Stack limit per item id.   |

The indexes must be inside the inventory, must differ, and must both hold stacks of the same id.

The return value is `{ slots, moved }`.

| Field   | Type   | Meaning                                                                  |
| ------- | ------ | ------------------------------------------------------------------------ |
| `slots` | array  | The next inventory.                                                      |
| `moved` | number | How many units moved. `min(source.count, max(0, limit - target.count))`. |

The target count increases by `moved`. The source count decreases by `moved`. When the source count reaches 0, that slot becomes `null`. A full target moves `0` and both stacks stay. A different id is an error, not a swap. Pouring source into target is not the same call as pouring target into source: the target is the slot that fills first.

### `compactInventory(inventory, limits)`

Pour every later stack into the earliest stacks of the same id, then close gaps.

| Argument    | Type   | Role                     |
| ----------- | ------ | ------------------------ |
| `inventory` | array  | Slots.                   |
| `limits`    | object | Stack limit per item id. |

The return value is `{ slots }`. The array length is unchanged.

The pour uses the same direction as merge. For each occupied slot from index 0, later slots of that same id pour into it until it is full or no later stack of that id remains. A different id in between does not block the pour, and it is not moved by the pour. Stacks that reach a count of 0 become `null`.

Gaps close after the pour. Occupied slots keep their relative order and slide toward index 0. Empty slots end at the tail. Compact is not a sort. It does not group every stack of one id in front of the items that sat between them. A remainder that did not fit in an earlier stack stays after those in-between items. Running compact on its own result yields the same slot values.

### Errors

The inventory is validated before the operation arguments. `addItems` validates the item shape before the limits object, and it validates slots before it checks that the added id has a limit. The other three functions validate the limits object and then the slots before they read indexes or a split count.

These messages are the whole error text.

| When                                                                          | Error        | Message                                                         |
| ----------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| Inventory is not an array                                                     | `TypeError`  | `inventory must be an array`                                    |
| Item is not a non-array object                                                | `TypeError`  | `item must be an object`                                        |
| Item id is missing, not a string, or empty                                    | `TypeError`  | `item id must be a non-empty string`                            |
| Item count is not a safe integer greater than or equal to 1                   | `RangeError` | `item count must be an integer greater than or equal to 1`      |
| Limits is not a non-array object                                              | `TypeError`  | `limits must be an object`                                      |
| A limit key is an empty string                                                | `TypeError`  | `limit id must be a non-empty string`                           |
| A limit value is not a safe integer greater than or equal to 1                | `RangeError` | `limit must be an integer greater than or equal to 1`           |
| A slot is omitted, `undefined`, or not `null` or a stack object               | `TypeError`  | `slot must be null or a stack`                                  |
| A stack id is missing, not a string, or empty                                 | `TypeError`  | `stack id must be a non-empty string`                           |
| A stack count is not a safe integer greater than or equal to 1                | `RangeError` | `stack count must be an integer greater than or equal to 1`     |
| An id in the inventory, or the id being added, has no own limit               | `TypeError`  | `limit must be set for the item`                                |
| A stack count is above that id's limit                                        | `RangeError` | `stack count must not exceed the item limit`                    |
| A split or the split index is outside the inventory, or is not a safe integer | `RangeError` | `index must be an integer inside the inventory`                 |
| The split index is an empty slot                                              | `TypeError`  | `index must point at a stack`                                   |
| The split count is outside 1 through the stack count                          | `RangeError` | `split count must be an integer from 1 through the stack count` |
| The source index is outside the inventory or is not a safe integer            | `RangeError` | `source index must be an integer inside the inventory`          |
| The target index is outside the inventory or is not a safe integer            | `RangeError` | `target index must be an integer inside the inventory`          |
| The source and target indexes are the same slot                               | `RangeError` | `source and target must differ`                                 |
| The source slot is empty                                                      | `TypeError`  | `source must be a stack`                                        |
| The target slot is empty                                                      | `TypeError`  | `target must be a stack`                                        |
| The two stacks have different ids                                             | `TypeError`  | `stacks must share an item id`                                  |

Slot errors are reported from index 0. Within a slot, the id is checked before the count, and the count is checked before the limit. Within `mergeStacks`, a bad source index is reported before a bad target index. Equal indexes are reported before an empty slot. An empty source is reported before an empty target. Within `splitStack`, a bad index is reported before an empty slot, and an empty slot is reported before a bad split count.

`Number.MAX_SAFE_INTEGER` is a legal count and a legal limit. One past that value is not a safe integer and is rejected. Counts are not rounded.

## Design notes

The inventory length is part of the input. Growing the array when something does not fit would hide a full bag. Overflow is that remainder, as a count, so the caller can drop it, hold it, or try another inventory. `placed + overflow` equals the requested count. A request of zero is rejected. An empty bag reports the whole request as overflow.

Partial stacks are filled before empty slots because that is the usual rule for putting items into a bag that already has an open stack. The scan is lowest index first, twice: once for stacks of the same id, then once for `null`. A single left-to-right pass would drop new items into an empty slot that sits in front of a partial stack. Those are different bags. The earliest partial also absorbs the whole addition when it has room. The function does not balance counts across stacks.

A limit belongs to an item id, not to the bag. Potions can stack to 10 while a sword stays at 1. A missing id is an error rather than an unlimited stack. Only own enumerable keys count, so a limit sitting on the prototype cannot apply, and a non-enumerable property cannot apply either. Ids are exact strings. Case and trailing spaces are not folded, because the caller is the one who decides which strings are the same item.

Split is only the removal. Choosing a destination is a separate call, usually `addItems` or `mergeStacks`. That keeps split defined when every other slot is full: the piece comes back to the caller, and the slot clears when the whole stack was taken.

Merge is a pour in one direction. The target fills first, and the source keeps the leftover or disappears. Reversing the indexes fills the other slot. Different ids throw. A swap would be a third operation, and a silent no-op would look like a successful combine. A full target returns `moved` of 0 and still returns a new copy of the slots.

Compact uses that same pour across the whole inventory, then deletes holes. It is not an id sort. Sorting by string would move items the caller had already placed, and it would depend on code-unit order. First-seen grouping would pull a remainder over the item that sat between two stacks. Compact leaves that in-between item where it is relative to the stacks that survive. Earlier stacks of an id become full first. Extra stacks of that id disappear only when their units fit into those earlier stacks. The survivors then slide toward index 0, preserving their order. A second compact has nothing left to pour and no holes to close.

Every call copies slot objects, including slots it did not change, and then freezes the copy. The caller's objects stay writable. Two calls do not share result objects, so freezing one result cannot change the next call. A later edit to an input stack is visible only to a later call.

The same inventory, the same counts, and the same indexes produce the same result. The module does not read a clock, wait, or generate a number. There is no hidden bag order and no tolerance that rounds a fractional count into a stack.

## License

MIT. Copyright (c) 2026 Vadim Gubin.
