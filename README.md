# JSON++

A JSON5-like data exchange / config format with `new` expresssions.

## Why?

- You can statically typecheck your config files with TypeScript tools.
- Can create instances of classes with no additional deserialization step.
- Supports circular references.

## Definition

Take JSON. Add comments, single quotes, unquoted keys, trailing commas and escaped newlines. That's JSON5. Add `new` expressions, wrap it in an `export default` statement, add `const` statements and `import` statements. That's JSON++.


Expressions has to be wrapped in `export default`:

```
export default {
  some: 'JSON value',
};
```

However, you can use new expressions:

```
export default new Point(2, 5)
```

This solves the old problem of dates, regexps, sets and maps:
```
export default {
  date: new Date("2022-12-27"),
  regexp: new RegExp("\\s+"),
  set: new Set(["admin", "moderator"]),
  map: new Map([[1, 2], [2, 4], [2, 5]]),
}
```

