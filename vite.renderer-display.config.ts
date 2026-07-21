import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';
import { resolve } from 'path';
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
    // Own dep-optimization cache per renderer dev server, see the note in
    // vite.renderer.config.ts.
    cacheDir: `node_modules/.vite/${name}`,
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'display.html'),
        },
      },
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
