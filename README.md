# neoJSON

A data exchange & config format, a subset of ES2017, fully supporting JSON and JSON5 expressions, with added support for `new` expresssions.

```javascript
// person.neojson.js
import { Person } from ".";
export default new Person({
  name: "John Doe",
  birthDate: new Date("1990-12-27"),
  roles: new Set(["admin", "moderator"]),
});
```

## Why?

- You can statically typecheck your config files with TypeScript/Flow (by inferring the constructors' argument types).
- You can serialize and deserialize your own class instances.
- You can use Dates, RegExps, Sets and Maps.

## Definition

Take JSON. Add comments, single quotes, unquoted keys, trailing commas and escaped newlines. That's roughly JSON5. Add `new` expressions, wrap it in an `export default` statement, and add the necessary `import` statements. That's neoJSON.

In a neoJSON file, the entire expression must be wrapped in `export default`:

```javascript
export default {
  some: "JSON value",
};
```

You can use `new` expressions for some global classes:

```javascript
export default {
  date: new Date("2022-12-27"),
  regexp: new RegExp("\\s+"),
  set: new Set(["admin", "moderator"]),
  map: new Map([[1, 2]]),
};
```

and you can use your own classes:

```javascript
import MyClass from "./my-class.js";
import { MyPoint as Point } from "./my-point.js";
export default {
  x: new MyClass("hi"),
  y: new Point({ x: 1, y: 2 }),
};
```

## Usage

```javascript
import { parse, stringify } from "neojson";

class Person {
  constructor({ name, age }) {
    this.name = name;
    this.age = age;
  }
  toNeoJSON() {
    const { name, age } = this;
    return [{ name, age }]; // the constructor arguments
  }
}

// imports per file path
const imports = { ".": { Person } };

const person = new Person({ name: "Joe", age: 42 });
const str = stringify(person, { imports });
console.log(str);
console.log(parse(str, { imports }));
```

The generated neoJSON string is:

```javascript
import { Person } from ".";
export default new Person({ name: "Joe", age: 42 });
```

## API

### `parse(str, options)`

Parses a neoJSON string and returns the value. `options` is an object with the following properties:

- `imports` (optional): an object mapping file paths to objects containing the constructors to use for `new` expressions. The default is `{}`.

### `stringify(value, options)`

Stringifies a value to a neoJSON string. `options` is an object with the following properties:

- `imports` (optional): an object mapping file paths to objects containing the constructors to use for `new` expressions. The default is `{}`.

## Is it safe?

As long as your constructors are safe and you don't provide the `Function` constructor to `parse`, yes. The parser does not use `eval`, it uses Babel's parser.
