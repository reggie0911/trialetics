import path from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: [
    '../components/ctms/finance-module/_shared/**/*.stories.@(ts|tsx)',
    '../components/ctms/finance-module/_shared/chips/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  staticDirs: ['../public'],
  webpackFinal: async (cfg) => {
    const root = path.resolve(__dirname, '..');
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias as Record<string, string | false | string[]>),
      '@': root,
      'next/navigation': path.resolve(__dirname, 'next-navigation-stub.ts'),
      'next/link': path.resolve(__dirname, 'next-link-stub.tsx'),
      // Next.js package is not installed for webpack; mirror vitest stub.
      'server-only': path.resolve(__dirname, '../tests/stubs/server-only.ts'),
    };
    // Strip TS (import type, inline type imports) before Storybook docgen/csf-plugin,
    // which parse with acorn and cannot handle TypeScript syntax.
    cfg.module = cfg.module ?? { rules: [] };
    cfg.module.rules = cfg.module.rules ?? [];
    cfg.module.rules.unshift({
      test: /\.(cjs|mjs|jsx?|tsx?)$/,
      include: [root, path.resolve(__dirname)],
      exclude: (abs: string) =>
        /[/\\]node_modules[/\\]/.test(abs) || /[/\\]\.next[/\\]/.test(abs),
      enforce: 'pre',
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: {
            configFile: path.resolve(__dirname, 'babel.config.js'),
            cacheDirectory: true,
          },
        },
      ],
    });
    return cfg;
  },
};

export default config;
