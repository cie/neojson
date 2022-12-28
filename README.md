# neoJSON

A data exchange & config format, a subset of ES2017, fully supporting JSON and JSON5 expressions, with added support for `new` expresssions.

```javascript
// person.neojson.js
export default {
  name: "John Doe",
  birthDate: new Date("1990-12-27"),
  roles: new Set(["admin", "moderator"]),
};
```

## Why?

- You can serialize and deserialize your own class instances.
- You can use Dates, RegExps, Sets and Maps.
- You can statically typecheck your config files with TypeScript/Flow (by inferring the constructors' argument types).

## Definition

Take JSON. Add comments, single quotes, unquoted keys, trailing commas and escaped newlines. That's roughly JSON5. Add `new` expressions, wrap it in an `export default` statement, and add the necessary `import` statements. That's neoJSON.

In a JSON++ file, the expression is wrapped in `export default`:

```javascript
export default {
  some: "JSON value",
};
```

You can use `new` expressions for these global classes:

```javascript
export default {
  date: new Date("2022-12-27"),
  regexp: new RegExp("\\s+"),
  set: new Set(["admin", "moderator"]),
  map: new Map([
    [1, 2],
    [2, 4],
  ]),
};
```

You can use your own classes:

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
console.log(stringify({ date: new Date("2022-12-27") }));
console.log(
  parse("import Error from 'error'; export default new Error('oops')", {
    imports: { error: { Error } },
  })
);
```

## Is it safe?

As long as your constructors are safe and you don't provide the `Function` constructor to `parse`, yes. The parser does not use `eval`, it uses Babel's parser.
