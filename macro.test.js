const write = require('fs').writeFileSync;
const babel = require('@babel/core');
const vm = require('vm');
const decoders = require('decoders');

const filename = `${__dirname}/__testing__.js`;

const prefix = `// @flow\nconst guard = require('./macro');\n`;

const t = (guardCode, guardName = 'guard') => {
  const src = `${guardCode}`;
  write(filename, src);
  /**
   * Make Snapshot
   */
  const code = babel.transformSync(src, {
    filename,
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-syntax-flow',
      'macros',
    ],
  }).code;
  expect(code).toMatchSnapshot();

  /**
   * Make certain its executable
   */
  const script = new vm.Script(code);
  const sandbox = { require: () => decoders };
  vm.createContext(sandbox);
  script.runInContext(sandbox);
};

const tests = [
  ['string', '"foo"'],
  ['number', '14'],
  ['boolean', 'true'],
  ['String', '"foo"'],
  ['Number', '14'],
  ['Boolean', 'true'],
  ['?string', 'null'],
  ['?string | boolean | Number', '3'],
  ['string | null', 'null'],
  ['{ a: { b: string }, c: number }', "{ a: { b: 'b' }, c: 2 }"],
  ['"foo"', "'foo'"],
  ['5', '5'],
  ['true', 'true'],
];

it('can create inline checks', () => {
  // Test all the inline types (pulls from Babel AST).
  tests.forEach(([a, b]) => {
    t(`${prefix}guard<${a}>(${b});\n`);
  });
});

it('can create aliased checks', () => {
  // Test all the aliased types (infered from Flow AST).
  tests.forEach(([a, b]) => {
    t(`${prefix}type Foo = ${a};
guard<Foo>(${b});\n`);
  });
});

it('can create inline checks with shadowed variables', () => {
  tests.forEach(([a, b]) => {
    t(`// @flow
      const g = require('./macro');

      function foo() {
        const guard = 'foo';
        const string = 'foo';
        const boolean = 'foo';
        const object = 'foo';

        g<${a}>(${b});
      }
      foo();
    `);
  });
});

it('can create aliased checks with shadowed variables', () => {
  tests.forEach(([a, b]) => {
    t(`// @flow
        type Foo = ${a};
        const g = require('./macro');
        const guard = 'foo';
        const string = 'foo';
        const boolean = 'foo';
        const object = 'foo';

        function foo() {
          const gg = '4';
          {
            const ggg = '4';
            g<Foo>(${b});
          }

        }
        foo();
      `);
  });
});

it('works with decoders', () => {
  tests.forEach(([a, b]) => {
    t(`// @flow
      type Foo = ${a};
      const guard = require('decoders').guard;
      const createDecoder = require('./decoder.macro');
      const string = 'foo';
      const boolean = 'foo';
      const object = 'foo';

      function foo() {
        const gg = '4';
        {
          const ggg = '4';
          const decoder = createDecoder<Foo>();
          guard(decoder)(${b})
        }

      }
      foo();
    `);
  });
});
