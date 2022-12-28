const stringify = require("../lib/stringify");

const t = require("tap");

t.test("stringify", (t) => {
  t.test("stringifies JSON values", (t) => {
    t.strictSame(stringify(1), "export default 1;", "stringifies numbers");
    t.strictSame(stringify(null), "export default null;", "stringifies null");
    t.strictSame(
      stringify({ x: 3 }),
      'export default {"x":3};',
      "stringifies plain objects"
    );
    t.strictSame(
      stringify("hello"),
      'export default "hello";',
      "stringifies strings"
    );
    t.strictSame(
      stringify("a\nb"),
      `export default "a\\
\\nb";`,
      "newlines have a line break before"
    );
    t.end();
  });
  t.test("stringifies class instances", (t) => {
    t.strictSame(
      stringify(
        new Map([
          ["a", 1],
          ["b", 2],
        ])
      ),
      'export default new Map([["a",1],["b",2]]);',
      "stringifies Maps"
    );
    t.strictSame(
      stringify(new Set(["a"])),
      'export default new Set(["a"]);',
      "stringifies Sets"
    );
    t.strictSame(
      stringify(new Date("2020-01-01")),
      'export default new Date("2020-01-01T00:00:00.000Z");',
      "stringifies Sets"
    );
    t.strictSame(
      stringify(new RegExp("a", "g")),
      'export default new RegExp("a","g");',
      "stringifies RegExp"
    );
    t.throws(() => {
      stringify(new Error("oops"));
    }, /Unknown class Error/);
    class Foreign {}
    t.throws(() => {
      stringify(new Foreign(), { imports: { foo: { Foreign } } });
    }, /Cannot stringify Foreign/);
    t.end();
  });

  t.end();
});
