const parse = require("../lib/parse");
const stringify = require("../lib/stringify");

const t = require("tap");

t.test("round-trip", (t) => {
  class S {
    constructor(x = 5) {
      this.x = x;
    }
    toNeoJSON() {
      return [this.x];
    }
  }
  class G {
    constructor(opts) {
      Object.assign(this, opts);
    }
    toNeoJSON() {
      return [{ ...this }];
    }
  }
  const imports = {
    foo: {
      default: S,
      G,
    },
  };
  function roundTrip(input) {
    t.strictSame(
      parse(stringify(input, { imports }), { imports }),
      input,
      stringify(input, { imports })
    );
  }
  function xroundTrip(input) {
    throw stringify(input, { imports });
  }
  roundTrip(null);
  roundTrip(true);
  roundTrip(false);
  roundTrip({ x: 3 });
  roundTrip({ hello: "world" });
  roundTrip([]);
  roundTrip([4, false, [[]]]);
  roundTrip("");
  roundTrip(new Date("2020-10-10"));
  roundTrip(new Set());
  roundTrip(new Set([1, 2, 3]));
  roundTrip(new Map());
  roundTrip(
    new Map([
      [1, 2],
      [3, 4],
    ])
  );
  roundTrip(new RegExp("foo"));
  roundTrip(new RegExp("foo", "g"));
  roundTrip(new RegExp("foo", "gi"));
  roundTrip(new RegExp("foo", "gim"));
  roundTrip(new RegExp("foo", "gimsuy"));
  roundTrip(new S(10));
  roundTrip(new S());
  roundTrip(new G(10));
  roundTrip(new G({ x: 10 }));

  t.end();
});
