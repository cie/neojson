const Parser = require('@babel/parser')

/**
 * @typedef {{
 *  imports: {[path: string]: {[name: string]: string}}
 * }} Options
 */

/**
 *
 * @param {string} source
 * @param {Options} opts
 * @returns
 */
module.exports = function parse(source, { imports = {} } = {}) {
  const ast = Parser.parse(source, {
    sourceType: 'module',
  })
  const globals = new Map([
    ['Map', Map],
    ['Set', Set],
    ['Date', Date],
    ['RegExp', RegExp],
  ])
  const locals = new Map()

  return file(ast)

  /** @param {import('@babel/types').File} n */
  function file(n) {
    return program(n.program)
  }

  /** @param {import('@babel/types').Program} n */
  function program(n) {
    let importStatements = []
    let declarations = []
    let exportStatements = []
    for (const statement of n.body) {
      if (statement.type === 'ImportDeclaration') {
        if (exportStatements.length > 0)
          error('Imports must be before the default export', statement)
        if (declarations.length > 0)
          error('Imports must be before declarations', statement)
        importStatements.push(statement)
      } else if (statement.type === 'VariableDeclaration') {
        if (exportStatements.length > 0)
          error('Declarations must be before the default export', statement)
        declarations.push(statement)
        return declaration(statement)
      } else if (statement.type === 'ExportDefaultDeclaration') {
        if (exportStatements.length > 0)
          error('Only one default export is allowed', statement)
        exportStatements.push(statement)
      } else error(`Unexpected ${statement.type}`, statement)
    }
    for (const statement of importStatements) importStatement(statement)
    if (exportStatements.length === 0) throw new Error('Missing default export')
    return expression(exportStatements[0].declaration)
  }

  /** @param {import('@babel/types').ImportDeclaration} n */
  function importStatement(n) {
    for (const specifier of n.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        if (!(n.source.value in imports))
          error(`Unknown import ${JSON.stringify(n.source.value)}`, n.source)
        const { default: name } = imports[n.source.value]
        if (!name)
          error(
            `No default export in ${JSON.stringify(n.source.value)}`,
            specifier
          )
        locals.set(specifier.local.name, name)
      } else if (specifier.type === 'ImportSpecifier') {
        if (!(n.source.value in imports))
          error(`Unknown import ${JSON.stringify(n.source.value)}`, n.source)
        const { [specifier.imported.name]: name } = imports[n.source.value]
        if (!name)
          error(
            `No named export ${specifier.imported.name} in ${JSON.stringify(
              n.source.value
            )}`,
            specifier
          )
        locals.set(specifier.local.name, name)
      } else error(`Unexpected ${specifier.type}`, specifier)
    }
  }

  /** @param {import('@babel/types').Node} n */
  function expression(n) {
    if (n.type === 'NewExpression') return newExpression(n)
    if (n.type === 'ArrayExpression') return array(n)
    if (n.type === 'ObjectExpression') return object(n)
    if (n.type === 'StringLiteral') return string(n)
    if (n.type === 'NumericLiteral') return number(n)
    if (n.type === 'BooleanLiteral') return boolean(n)
    if (n.type === 'NullLiteral') return nullLiteral(n)
    error(`Unexpected ${n.type}`, n)
  }

  /** @param {import('@babel/types').NewExpression} n */
  function newExpression(n) {
    if (n.callee.type !== 'Identifier')
      error(`Unexpected ${n.callee.type}`, n.callee)
    const name = n.callee.name
    if (!locals.has(name) && !globals.has(name))
      error(`Unknown class ${name}`, n.callee)
    const Class = locals.has(name) ? locals.get(name) : globals.get(name)
    return new Class(...n.arguments.map(expression))
  }

  /** @param {import('@babel/types').ArrayExpression} n */
  function array(n) {
    return n.elements.map(expression)
  }

  /** @param {import('@babel/types').ObjectExpression} n */
  function object(n) {
    const obj = {}
    for (const prop of n.properties) {
      if (prop.type !== 'ObjectProperty') error(`Unexpected ${prop.type}`, prop)
      if (prop.computed) error('Computed properties are not allowed', prop)
      if (
        !(prop.key.type === 'Identifier' || prop.key.type === 'StringLiteral')
      )
        error(`Cannot use ${prop.key.type} as key`, prop.key)
      obj[prop.key.type === 'Identifier' ? prop.key.name : prop.key.value] =
        expression(prop.value)
    }
    return obj
  }

  /** @param {import('@babel/types').StringLiteral} n */
  function string(n) {
    return n.value
  }

  /** @param {import('@babel/types').NumericLiteral} n */
  function number(n) {
    return n.value
  }

  /** @param {import('@babel/types').BooleanLiteral} n */
  function boolean(n) {
    return n.value
  }

  /** @param {import('@babel/types').NullLiteral} n */
  function nullLiteral(n) {
    return null
  }

  /** @param {import('@babel/types').VariableDeclaration} n */
  function declaration(n) {
    if (n.kind !== 'const') error(`Unexpected ${n.kind} declaration`, n)
    n.declarations.forEach((decl) => {
      if (decl.id.type !== 'Identifier')
        error(`Unexpected ${decl.id.type}`, decl)
      if (!decl.init) error(`Missing value for ${decl.id.name}`, decl)
      locals.set(decl.id.name, expression(decl.init))
    })
  }
}

class ParseError extends Error {
  /**
   * @param {string} message
   * @param {import('@babel/types').Node} node
   */
  constructor(message, node) {
    super(
      message + ' at ' + node.loc.start.line + ':' + (node.loc.start.column + 1)
    )
  }
}
module.exports.ParseError = ParseError

/** @returns {never} */
function error(msg, n) {
  throw new ParseError(msg, n)
}
