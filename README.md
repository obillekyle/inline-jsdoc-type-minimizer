# Inline JSDoc Type Minimizer

A VS Code extension that minimizes inline JSDoc type annotations to keep your code clean and readable.

## Features

- **Compact JSDoc Types**: Automatically formats JSDoc type annotations for inline use
- **Reduces Visual Clutter**: Minimizes verbose type declarations without losing type information
- **Smart Formatting**: Preserves type accuracy while improving code appearance

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

## License

MIT
