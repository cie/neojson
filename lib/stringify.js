/**
 * @typedef {{
 *   imports?: {[path: string]: {[name: string]: string}}
 * }} Options
 */

/**
 * @param {*} x
 * @param {Options} opts
 * @returns
 */
module.exports = function stringify(x, { imports = {} } = {}) {
  const globals = new Map([
    [
      Map,
      function () {
        return [Array.from(this)]
      },
    ],
    [
      Set,
      function () {
        return [Array.from(this)]
      },
    ],
    [
      Date,
      function () {
        return [this.toISOString()]
      },
    ],
    [
      RegExp,
      function () {
        return [this.source, this.flags]
      },
    ],
  ])
  const locals = new Map()
  let importStatements = ''
  const expr = stringifyExpr(x)
  return `${importStatements}export default ${expr};`

  function stringifyExpr(x) {
    if (typeof x === 'number' || typeof x === 'boolean' || x === null) {
      return JSON.stringify(x)
    }
    if (typeof x === 'string') {
      return JSON.stringify(x).replace(/\\[n\\]/, (x) =>
        x === '\\n' ? '\\\n\\n' : x
      )
    }
    if (Array.isArray(x)) {
      return `[${x.map(stringifyExpr).join(',')}]`
    }
    if (isPlainObject(x)) {
      return `{${Object.entries(x)
        .map(([k, v]) => `${JSON.stringify(k)}:${stringifyExpr(v)}`)
        .join(',')}}`
    }
    let localName = x.constructor.name
    if (!globals.has(x.constructor)) {
      localName = findImport(x.constructor)
    }
    const makeArgs = globals.get(x.constructor) ?? x.toNeoJSON
    if (!makeArgs)
      throw new Error(`Cannot stringify ${x.constructor.name || ''}`)
    return `new ${localName}(${makeArgs
      .apply(x, [])
      .map(stringifyExpr)
      .join(',')})`
  }

  function findImport(clazz) {
    for (const [path, exports] of Object.entries(imports)) {
      for (const [importedName, value] of Object.entries(exports)) {
        if (clazz === value) {
          const localName = makeLocalName(
            importedName === 'default' ? value.name || '_' : importedName,
            value
          )
          importStatements +=
            importedName === 'default'
              ? `import ${localName} from ${JSON.stringify(path)};`
              : `import { ${
                  importedName === localName ? '' : `${importedName} as `
                }${localName} } from ${JSON.stringify(path)};\n`
          return localName
        }
      }
    }
    throw new Error(`Unknown class ${clazz.name || '(unnamed)'}`)
  }

  function makeLocalName(suggested, value) {
    for (let i = 0; ; i++) {
      const localName = i === 0 ? suggested : `${suggested}_${i}`
      const existingValue = locals.get(localName)
      if (existingValue === value) return localName
      if (!existingValue) {
        locals.set(localName, value)
        return localName
      }
    }
  }
}

function isPlainObject(obj) {
  return Object.getPrototypeOf(obj) === Object.prototype
}
