// @ts-nocheck
// prettier-ignore

// Normal variable assignment
const myVar = /** @type {string | number} */ (10);

// Normal function parameter
const myFunc = (/** @type {string} */ myParam = 'hello') => {
  console.log(myParam);
};

// Optional function parameter using undefined in union
function anotherFunc(
  /** @type {number | undefined | boolean} */ optionalParam,
) {
  return optionalParam;
}

// Function with multiple parameters and types
const multiParam = (
  /** @type {string} */ p1,
  /** @type {Array<number>} */ p2,
) => {};

// Invalid function parameter context (should act as normal variable type)
const trickyVar = /** @type {string | number} */ (param = 10);

const ignored1 = /** @type {string} */ randomVar + var1;
const ignored2 = /** @type {number} */ someFunc(123);

// Long line test (should abort parsing because it is over 300 characters long)
const veryLongLine =
  /** @type {string | number | boolean | object | Array<string> | symbol | undefined | null} */ (
    'This is a very long text to simulate exceeding the character limit of three hundred characters so that the newly added config toggle will prevent the extension from parsing it and save performance...................................................................................................'
  );

// Complex object
const myObj = /** @type {{ name: string, age: number, isActive: boolean }} */ ({
  name: 'John',
  age: 30,
  isActive: true,
});
