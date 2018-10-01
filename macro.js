const createMacro = require('babel-plugin-macros').createMacro;
const exec = require('child_process').execSync;

const generateDecoder = type => {
  // TODO translate ast to decoders
  return `{ x: require('decoders').number, y: require('decoders').number }`;
};

module.exports = createMacro(({ babel, references, state }) => {
  references.default.forEach(({ parentPath, scope, path }) => {
    /**
     * Step 1: Get flow type
     */
    const filename = state.file.opts.filename;
    const type = parentPath.node.typeArguments.params[0];
    const line = type.loc.end.line;
    const column = type.loc.end.column;
    const raw = exec(
      `./node_modules/.bin/flow type-at-pos ${filename} ${line} ${column} --expand-type-aliases --expand-json-output`,
    );
    const json = JSON.parse(raw).expanded_type;

    /**
     * Step 2: Create runtime code for that flow type
     */
    const node = babel.template(
      `require('decoders').guard(${generateDecoder(json)})()`,
    )();

    /**
     * Step 3: Replace call to guard with explicit decoder guard
     */
    node.expression.arguments = [parentPath.node.arguments[0]];
    parentPath.replaceWith(node);
  });
});
