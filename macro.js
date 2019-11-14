// @noflow

const { createMacro, MacroError } = require('babel-plugin-macros');
const prettier = require('prettier');
const exec = require('child_process').execSync;

const toDecoderFromFlowAst = opts => {
  const { typeNode, imports, originalCode, filename, variablesInUse } = opts;

  const getVariableNotInUse = key => {
    if (!variablesInUse[key]) {
      return key;
    }
    if (!variablesInUse[`_${key}`]) {
      return `_${key}`;
    }
    if (!variablesInUse[`__${key}`]) {
      return `__${key}`;
    }
    throw new MacroError(`No suitable variable found for ${key}`);
  };

  const to = (str, newImports) => {
    const vn = getVariableNotInUse(str);

    return {
      imports: {
        ...imports,
        ...(newImports ? newImports : { [str]: vn }),
      },
      code: !newImports ? vn : str,
    };
  };

  switch (typeNode.kind) {
    case 'BoolLit':
    case 'NumLit': {
      const n = getVariableNotInUse('constant');
      return to(`${n}(${typeNode.literal})`, { constant: n });
    }
    case 'StrLit': {
      const n = getVariableNotInUse('constant');
      return to(`${n}('${typeNode.literal}')`, { constant: n });
    }
    case 'Num':
      return to('number');
    case 'Str':
      return to('string');
    case 'Bool':
      return to('boolean');
    case 'Null':
      return to('null_');
    case 'Void':
      return to('undefined_');
    case 'AnyObj':
      return to('pojo');
    case 'Any':
      return to('mixed');
    case 'Top':
      return to('mixed');
    case 'Union': {
      const numTypes = typeNode.types.length;

      const types = typeNode.types.map(n =>
        toDecoderFromFlowAst({ ...opts, typeNode: n }),
      );
      const newImports = types.reduce(
        (acc, t) => ({ ...acc, ...t.imports }),
        {},
      );

      if (numTypes > 15) {
        throw new MacroError(
          `Unable to handle more than 9 union types "${typeNode.type}" in for the code: ${originalCode}`,
        );
      }

      if (numTypes > 9) {
        const either = `either${numTypes - 8 > 2 ? numTypes - 8 : ''}`;
        const eitherVn = getVariableNotInUse(either);

        const either9 = getVariableNotInUse('either9');

        return {
          imports: {
            ...imports,
            ...newImports,
            [either]: eitherVn,
            either9: either9,
          },
          code: `${either9}(${types
            .slice(0, 8)
            .map(t => t.code)
            .join(', ')}, ${eitherVn}(${types.slice(8).map(t => t.code)}))`,
        };
      }

      const either = `either${numTypes > 2 ? numTypes : ''}`;
      const eitherVn = getVariableNotInUse(either);

      return {
        imports: { ...imports, ...newImports, [either]: eitherVn },
        code: `${eitherVn}(${types.map(t => t.code).join(', ')})`,
      };
    }
    case 'Inter':
      const isAllObjTypes =
        typeNode.types.filter(({ kind }) => kind === 'Obj').length ===
        typeNode.types.length;
      if (isAllObjTypes) {
        const props = typeNode.types.reduce(
          (acc, { props }) => [...acc, ...props],
          [],
        );
        return toDecoderFromFlowAst({
          ...opts,
          typeNode: { kind: 'Obj', exact: false, frozen: false, props },
        });
      }
      return toDecoderFromFlowAst({
        ...opts,
        typeNode: typeNode.types[0],
      });
    case 'Arr': {
      const arrayType = toDecoderFromFlowAst({
        ...opts,
        typeNode: typeNode.type,
      });
      const array = getVariableNotInUse('array');

      return {
        imports: {
          ...imports,
          ...arrayType.imports,
          array,
        },
        code: `${array}(${arrayType.code})`,
      };
    }
    case 'Obj': {
      const types = typeNode.props.map(p => {
        return {
          optional: p.prop.prop.optional,
          property: "'" + p.prop.name + "'",
          decoder: toDecoderFromFlowAst({
            ...opts,
            typeNode: p.prop.prop.type,
          }),
        };
      });
      const newImports = types.reduce(
        (acc, t) => ({ ...acc, ...t.decoder.imports }),
        {},
      );

      const hasOptionalField = types.find(t => t.optional);

      const optional = getVariableNotInUse('optional');
      const object = getVariableNotInUse('object');

      return {
        imports: {
          ...imports,
          ...newImports,
          ...(hasOptionalField ? { optional } : {}),
          object,
        },
        code: `${object}({ ${types
          .map(
            t =>
              `${t.property}: ${
                t.optional ? `${optional}(${t.decoder.code})` : t.decoder.code
              }`,
          )
          .join(',')} })`,
      };
    }
    case 'class':
    case 'Generic': {
      switch (typeNode.type.name) {
        case 'Number':
          return to('number');
        case 'String':
          return to('string');
        case 'Boolean':
          return to('boolean');
        case 'Date':
          return to('date');
        default:
          return to('mixed');
      }
    }
    default:
      throw new MacroError(
        `Unable to create runtime guard for flow ast type "${typeNode.kind}" in for the code: ${originalCode}`,
      );
  }
};

const toDecoderFromBabelAst = opts => {
  const { typeNode, imports, originalCode, filename, variablesInUse } = opts;

  const getVariableNotInUse = key => {
    if (!variablesInUse[key]) {
      return key;
    }
    if (!variablesInUse[`_${key}`]) {
      return `_${key}`;
    }
    if (!variablesInUse[`__${key}`]) {
      return `__${key}`;
    }
    throw new MacroError(`No suitable variable found for ${key}`);
  };

  const to = (str, newImports) => {
    const vn = getVariableNotInUse(str);

    return {
      imports: {
        ...imports,
        ...(newImports ? newImports : { [str]: vn }),
      },
      code: !newImports ? vn : str,
    };
  };

  switch (typeNode.type) {
    case 'BooleanLiteralTypeAnnotation':
    case 'NumberLiteralTypeAnnotation': {
      const n = getVariableNotInUse('constant');
      return to(`${n}(${typeNode.value})`, { constant: n });
    }
    case 'StringLiteralTypeAnnotation': {
      const n = getVariableNotInUse('constant');
      return to(`${n}('${typeNode.value}')`, { constant: n });
    }
    case 'StringTypeAnnotation':
      return to('string');
    case 'NumberTypeAnnotation':
      return to('number');
    case 'BooleanTypeAnnotation':
      return to('boolean');
    case 'NullLiteralTypeAnnotation':
      return to('null_');
    case 'VoidTypeAnnotation':
      return to('undefined_');
    case 'AnyTypeAnnotation':
    case 'MixedTypeAnnotation':
      return to('mixed');
    case 'NullableTypeAnnotation': {
      const nullable = getVariableNotInUse('nullable');
      const subType = toDecoderFromBabelAst({
        ...opts,
        typeNode: typeNode.typeAnnotation,
        imports: { ...imports, nullable },
      });
      return { imports: subType.imports, code: `${nullable}(${subType.code})` };
    }
    case 'UnionTypeAnnotation': {
      const numTypes = typeNode.types.length;
      if (numTypes > 9) {
        throw new MacroError(
          `Unable to handle more than 9 union types "${typeNode.type}" in for the code: ${originalCode}`,
        );
      }

      const types = typeNode.types.map(n =>
        toDecoderFromBabelAst({ ...opts, typeNode: n }),
      );
      const newImports = types.reduce(
        (acc, t) => ({ ...acc, ...t.imports }),
        {},
      );

      const either = `either${numTypes > 2 ? numTypes : ''}`;
      const eitherVn = getVariableNotInUse(either);

      return {
        imports: { ...imports, ...newImports, [either]: eitherVn },
        code: `${eitherVn}(${types.map(t => t.code).join(', ')})`,
      };
    }

    case 'ObjectTypeAnnotation': {
      const types = typeNode.properties.map(p => {
        if (p.key.type !== 'Identifier') {
          throw new MacroError(`All keys must be identifiers ${originalCode}`);
        }

        return {
          optional: p.optional,
          property: p.key.name,
          decoder: toDecoderFromBabelAst({ ...opts, typeNode: p.value }),
        };
      });
      const newImports = types.reduce(
        (acc, t) => ({ ...acc, ...t.decoder.imports }),
        {},
      );

      const hasOptionalField = types.find(t => t.optional);

      const optional = getVariableNotInUse('optional');
      const object = getVariableNotInUse('object');

      return {
        imports: {
          ...imports,
          ...newImports,
          ...(hasOptionalField ? { optional } : {}),
          object,
        },
        code: `${object}({ ${types
          .map(
            t =>
              `${t.property}: ${
                t.optional ? `${optional}(${t.decoder.code})` : t.decoder.code
              }`,
          )
          .join(',')} })`,
      };
    }

    case 'GenericTypeAnnotation': {
      switch (typeNode.id.name) {
        case 'Date':
          return to('date');
        case 'String':
          return to('string');
        case 'Number':
          return to('number');
        case 'Boolean':
          return to('boolean');
        case 'Object':
          return to('pojo');
        default: {
          const line = typeNode.loc.end.line;
          const column = typeNode.loc.end.column;
          const raw = exec(
            `./node_modules/.bin/flow type-at-pos ${filename} ${line} ${column} --expand-type-aliases --expand-json-output`,
          );

          const json = JSON.parse(raw.toString());
          const expandedType = json.expanded_type;

          return toDecoderFromFlowAst({ ...opts, typeNode: expandedType.body });
        }
      }
    }

    default:
      throw new MacroError(
        `Unable to create runtime guard for type "${typeNode.type}" in for the code: ${originalCode}`,
      );
  }
};

const getAllVariablesInScope = path => ({
  ...Object.keys(path.scope.bindings).reduce(
    (acc, v) => ({ ...acc, [v]: true }),
    {},
  ),
  ...(path.parentPath ? getAllVariablesInScope(path.parentPath) : {}),
});

const decoderMacro = funName => ({ babel, references, state, config }) => {
  const isCommonJs = config && config.sourceType === 'commonjs';
  let body = state.file.ast.program.body;
  let allImports = {};

  const t = babel.types;

  const toCode = n =>
    babel.transformFromAstSync(t.program([t.expressionStatement(n)])).code;

  if (!references.default.length) {
    return;
  }

  /**
   * We do not want to use variable names in any scope
   */
  const variablesInUse = references.default.reduce(
    (acc, path) => ({
      ...acc,
      ...getAllVariablesInScope(path),
    }),
    {},
  );

  const funIdentifier = references.default[0].node.name;

  references.default.forEach(({ parentPath, scope, path }) => {
    if (!parentPath.node.typeArguments) {
      throw new MacroError(`Must provide a type to ${funIdentifier} as shown below:

        Expected:
          ${funIdentifier}<SomeType>(...);

        Given:
          ${toCode(parentPath.node).replace(/\n/g, '\n          ')}

      `);
    }

    /**
     * Step 1: For each reference, get flow type
     */
    const filename = state.file.opts.filename;
    const typeNode = parentPath.node.typeArguments.params[0];

    const { imports, code } = toDecoderFromBabelAst({
      typeNode,
      imports: {},
      originalCode: toCode(parentPath.node),
      filename,
      variablesInUse,
    });
    allImports = { ...allImports, ...imports };

    /**
     * Step 2: Create runtime code for that flow type
     */
    const node = babel.template(
      prettier.format(funName ? `${funIdentifier}(${code})()` : code, {
        semi: true,
        parser: 'babel',
      }),
      {
        placeholderPattern: false,
      },
    )();

    /**
     * Step 3: Replace call to guard with decoder guard
     */
    if (funName) {
      node.expression.arguments = [parentPath.node.arguments[0]];
    }

    parentPath.replaceWith(node);
  });

  /**
   * Step 4: Add required decoder imports at the top.
   */
  const toAst = babel.template.ast;
  const importDeclarations = isCommonJs
    ? [
        ...(funName
          ? [toAst(`const ${funIdentifier} = require('decoders').${funName};`)]
          : []),
        ...Object.keys(allImports).map(key =>
          toAst(`const ${allImports[key]} = require('decoders').${key}`),
        ),
      ]
    : [
        toAst(
          `import { ${
            funName
              ? `${
                  funIdentifier === funName
                    ? funName
                    : `${funName} as ${funIdentifier}`
                }, `
              : ''
          }${Object.keys(allImports)
            .map(key =>
              key === allImports[key] ? key : `${key} as ${allImports[key]}`,
            )
            .join(', ')} } from 'decoders'`,
        ),
      ];

  state.file.ast.program.body = [...importDeclarations, ...body];
};

module.exports = createMacro(decoderMacro('guard'), {
  configName: 'flowGuard',
});
module.exports.decoderMacro = createMacro(decoderMacro(), {
  configName: 'flowGuard',
});
