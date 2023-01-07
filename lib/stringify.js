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

module.exports = function stringify(x, { imports = {} } = {}) {
  const localValues = new Map()
  const localNames = new Map()
  let importStatements = ''
  const refNames = new Map()
  const seen = new Set()
  const duplicates = new Set()

  findDuplicates(x)

  const defaultExport = `export default ${stringifyExpr(x)};`
  const constants = [...refNames.values()]
    .map((n) => `const ${n} = ${localValues.get(n)};\n`)
    .join('')
  return `${importStatements}${constants}${defaultExport}`

  function findDuplicates(x) {
    if (!isStructured(x)) return
    if (seen.has(x)) duplicates.add(x)
    else seen.add(x)
    if (Array.isArray(x)) x.forEach(findDuplicates)
    else if (isPlainObject(x)) Object.values(x).forEach(findDuplicates)
    else args(x).forEach(findDuplicates)
  }

  function stringifyExpr(x) {
    if (isStructured(x) && duplicates.has(x)) return makeRef(x)
    return expr(x, stringifyExpr)
  }

  function isStructured(x) {
    return x && typeof x === 'object'
  }

  function makeRef(x) {
    if (refNames.has(x)) return refNames.get(x)
    const [refName, isNew] = makeLocalName('ref', expr(x, stringifyExpr))
    if (isNew) refNames.set(x, refName)
    return refName
  }

  function expr(x, fn) {
    if (typeof x === 'string') return string(x)
    if (typeof x === 'number') return String(x)
    if (typeof x === 'boolean') return String(x)
    if (x === null) return 'null'
    if (Array.isArray(x)) return array(x, fn)
    if (isPlainObject(x)) return object(x, fn)
    return instance(x, fn)
  }

  function string(x) {
    return JSON.stringify(x).replace(/\\[n\\]/, (x) =>
      x === '\\n' ? '\\\n\\n' : x
    )
  }

  function array(x, fn) {
    return `[${x.map(fn).join(',')}]`
  }

  function object(x, fn) {
    return `{${Object.entries(x)
      .map(([k, v]) => `${key(k)}:${fn(v)}`)
      .join(',')}}`
  }

  function key(k) {
    return JSON.stringify(k)
  }

  function instance(x, fn) {
    let localName = x.constructor.name
    if (!globals.has(x.constructor)) {
      localName = findImport(x.constructor, imports)
    }
    return `new ${localName}(${args(x).map(fn).join(',')})`
  }

  function args(x) {
    const makeArgs = globals.get(x.constructor) ?? x.toNeoJSON
    if (!makeArgs) throw new Error(`Cannot stringify ${x.constructor.name}`)
    const args = makeArgs.apply(x, [])
    if (!Array.isArray(args))
      throw new Error(
        `${
          globals.get(x.constructor) != null
            ? x.constructor.name
            : 'toNeoJSON()'
        } did not return an array`
      )
    return args
  }

  function findImport(clazz, imports) {
    for (const [path, exports] of Object.entries(imports)) {
      for (const [importedName, value] of Object.entries(exports)) {
        if (clazz === value) {
          const [localName, isNew] = makeLocalName(
            importedName === 'default'
              ? String(value.name).match(/^[\w_$][\w\d_$]*$/)
                ? value.name
                : '_'
              : importedName,
            value
          )
          if (isNew)
            importStatements +=
              importedName === 'default'
                ? `import ${localName} from ${JSON.stringify(path)};\n`
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
    if (localNames.has(value)) return [localNames.get(value), false]
    for (let i = 0; ; i++) {
      const localName = i === 0 ? suggested : `${suggested}_${i}`
      const existingValue = localValues.get(localName)
      if (existingValue === value) return [localName, false]
      if (!existingValue) {
        localValues.set(localName, value)
        localNames.set(value, localName)
        return [localName, true]
      }
    }
  }
}

function isPlainObject(obj) {
  return Object.getPrototypeOf(obj) === Object.prototype
}
