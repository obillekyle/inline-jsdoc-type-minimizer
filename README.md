# Inline JSDoc Type Minimizer

A VS Code extension that minimizes inline JSDoc type annotations to keep your code clean and readable.

## Features

- **Compact JSDoc Types**: Automatically formats JSDoc type annotations for inline use
- **Reduces Visual Clutter**: Minimizes verbose type declarations without losing type information
- **Smart Formatting**: Preserves type accuracy while improving code appearance
- **Readonly Rendering**: Supports `@readonly` and displays it as `readonly` in minimized output
- **Assignment Type Inlining**: Supports assignment-style inline comments such as `/** @type {string} */ uid = value`

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Inline JSDoc Type Minimizer"
4. Click Install

## Example

### Before

```javascript
const value = /** @type {string|number|boolean} */ (getValue());
```

### After

```javascript
const value = <string|number|boolean>(getValue());
```

### Readonly Example

Before:

```javascript
/** @type {import('../tools/reactivity.js').Reactive<InferProps<T>>} @readonly */
render;
```

After:

```javascript
readonly < Reactive < InferProps < T >>> render;
```

### Assignment Example

Before:

```javascript
/** @type {string} */ uid = randomId();
```

After:

```javascript
uid: string = randomId();
```

## Configuration

- `inline-jsdoc-type-minimizer.inlineAssignments` (default: `true`): toggles assignment type inlining.
- `inline-jsdoc-type-minimizer.inlineReadonly` (default: `true`): toggles rendering `@readonly` as `readonly`.

## License

MIT
