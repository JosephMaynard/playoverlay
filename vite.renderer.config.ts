import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';
import { sharedResolve } from './vite.shared.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: './',
    // Each renderer dev server gets its own dep-optimization cache: the two
    // servers run concurrently, and sharing the default node_modules/.vite
    // lets one clobber the other's metadata, which loads two copies of React
    // in the affected window (blank page, "Invalid hook call").
    cacheDir: `node_modules/.vite/${name}`,
    build: {
      outDir: `.vite/renderer/${name}`,
    },
    plugins: [pluginExposeRenderer(name)],
    resolve: {
      ...sharedResolve,
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig;
});
