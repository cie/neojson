const parse = require("../lib/parse");

const t = require("tap");

t.test("parse", (t) => {
  t.test("simple JSON5 values", (t) => {
    t.strictSame(parse("export default null;"), null, "null");
    t.strictSame(parse("export default true"), true, "true");
    t.strictSame(parse("export default false"), false, "false");
    t.strictSame(parse("export default {x:3}"), { x: 3 }, "object");
    t.strictSame(
      parse("export default {'hello':\"world\",}"),
      { hello: "world" },
      "string keys, trailing comma"
    );
    t.strictSame(parse("export default []"), [], "empty array");
    t.strictSame(
      parse("export default [4,false,[[]]]"),
      [4, false, [[]]],
      "array"
    );
    t.strictSame(parse("export default ''"), "", "empty string");
    t.end();
  });

  t.test("global classes", (t) => {
    t.strictSame(
      parse("export default new Date('2020-10-10')"),
      new Date("2020-10-10"),
      "Date"
    );
    t.strictSame(parse("export default new Set"), new Set(), "empty Set");
    t.strictSame(
      parse("export default new Set([1,2,3])"),
      new Set([1, 2, 3]),
      "Set"
    );
    t.throws(
      () => parse("export default new String('')"),
      new Error("Unknown class String at 1:20")
    );
    t.end();
  });

  t.test("imports", (t) => {
    class S {
      constructor(x = 5) {
        this.x = x;
      }
    }
    t.strictSame(
      parse("import { S } from 'foo'; export default new S(10)", {
        imports: { foo: { S } },
      }),
      new S(10),
      "named import"
    );
    t.strictSame(
      parse("import S from 'foo'; export default new S", {
        imports: { foo: { default: S } },
      }),
      new S(5),
      "default import"
    );
    t.end();
  });
  t.test("invalid values", (t) => {
    t.throws(
      () => parse("export default ()=>{}"),
      /Unexpected ArrowFunctionExpression at 1:16/
    );
    t.throws(
      () => parse("export default function(){}"),
      /Unexpected FunctionDeclaration at 1:16/
    );
    t.throws(() => parse("import {} from 'foo'"), /Missing default export/);
    t.throws(
      () => parse("import * as x from 'foo'"),
      /Unexpected ImportNamespaceSpecifier at 1:8/
    );
    t.throws(
      () => parse("import X from 'foo'; export default 1"),
      /Unknown import "foo" at 1:1/
    );
    t.throws(
      () => parse("import { X } from 'foo'; export default 1"),
      /Unknown import "foo" at 1:1/
    );
    t.throws(
      () =>
        parse("import X from 'foo'; export default 1", {
          imports: { foo: {} },
        }),
      /No default export in "foo" at 1:8/
    );
    t.throws(
      () =>
        parse("import { X } from 'foo'; export default 1", {
          imports: { foo: {} },
        }),
      /No named export X in "foo" at 1:10/
    );
    t.throws(
      () => parse("export default {x() {}}"),
      /Unexpected ObjectMethod at 1:17/
    );
    t.throws(
      () => parse("const x = 4; export default [x]"),
      /Unexpected VariableDeclaration at 1:1/
    );
    t.throws(
      () => parse("export default new S; import S from 'foo'"),
      /Imports must be before the default export at 1:23/
    );
    t.throws(
      () => parse("export default 5\nexport default 6"),
      /Only one default export/
    );
    t.end();
  });

  t.end();
});
