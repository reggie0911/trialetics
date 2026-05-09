/** Babel config for Storybook webpack so `import type` / TS syntax in stories compiles. */
module.exports = {
  presets: [
    ['@babel/preset-env', { bugfixes: true }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
