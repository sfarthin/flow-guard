module.exports = {
  sourceType: 'module',
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-syntax-flow',
    'macros',
    '@babel/plugin-transform-flow-strip-types',
  ],
};
