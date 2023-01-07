const stringify = require("../lib/stringify");

const t = require("tap");

function check(x, str, t, msg = undefined) {
  t.strictSame(stringify(x), str, (msg = str));
}

t.test("stringify", (t) => {
  t.test("JSON values", (t) => {
    check(1, "export default 1;", t);
    check(null, "export default null;", t);
    check({ x: 3 }, 'export default {"x":3};', t, "plain object");
    check("hello\\\t", 'export default "hello\\\\\\t";', t, "string");
    check(
      "a\nb",
      `export default "a\\
\\nb";`,
      t,
      "newlines have a line break before"
    );
    t.end();
  });

  t.test("instances", (t) => {
    check(
      new Map([
        ["a", 1],
        ["b", 2],
      ]),
      'export default new Map([["a",1],["b",2]]);',
      t,
      "Map"
    );
    check(new Set(["a"]), 'export default new Set(["a"]);', t, "Set");
    check(
      new Date("2020-01-01"),
      'export default new Date("2020-01-01T00:00:00.000Z");',
      t,
      "Date"
    );
    check(
      new RegExp("a", "g"),
      'export default new RegExp("a","g");',
      t,
      "RegExp"
    );
    class Undeclared {
      toNeoJSON() {
        return [];
      }
    }
    t.throws(() => {
      stringify(new Undeclared());
    }, /Unknown class Undeclared/);
    class Foreign {}
    t.throws(() => {
      stringify(new Foreign(), { imports: { foo: { Foreign } } });
    }, /Cannot stringify Foreign/);
    class Invalid {
      toNeoJSON() {
        return;
      }
    }
    t.throws(() => {
      stringify(new Invalid(), { imports: { foo: { Invalid } } });
    }, /toNeoJSON\(\) did not return an array/);
    class A {
      toNeoJSON() {
        return [];
      }
    }
    t.strictSame(
      stringify(new A(), { imports: { ".": { default: A } } }),
      'import A from ".";\
\nexport default new A();'
    );
    t.test("special name of function", (t) => {
      const x = function () {
        this.toNeoJSON = () => [];
      };
      Object.defineProperty(x, "name", { value: "--" });
      t.strictSame(
        stringify(new x(), { imports: { ".": { default: x } } }),
        'import _ from ".";\
\nexport default new _();'
      );
      t.end();
    });
    t.strictSame(
      stringify(new A(), { imports: { ".": { V: A } } }),
      'import { V } from ".";\
\nexport default new V();'
    );
    t.end();
  });

  t.test("references", (t) => {
    const a = [];
    check([a, a], "const ref = [];\nexport default [ref,ref];", t, "one ref");
    class N {
      constructor(parent) {
        this.parent = parent;
      }
      toNeoJSON() {
        return this.parent ? [this.parent] : [];
      }
    }
    const root = new N();
    const n1 = new N(root);
    const n2 = new N(root);
    t.strictSame(
      stringify([root, n1, n2], { imports: { ".": { N } } }),
      `import { N } from ".";
const ref = new N();
export default [ref,new N(ref),new N(ref)];`,
      "one ref"
    );
    t.end();
  });

  t.end();
});
