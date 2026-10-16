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
      // Explicitly off: forge's own renderer defaults, which this config is
      // merged over, turn it on. The workspace packages are symlinked into
      // node_modules, and with it on they resolve to that node_modules path,
      // where Vite applies no tsconfig.json (their JSX compiles for the
      // classic runtime and the window fails with "React is not defined")
      // and, in dev, pre-bundles them as a third-party dependency. Off, they
      // resolve to their real path under packages/ and are built like src/.
      preserveSymlinks: false,
    },
    clearScreen: false,
  } as UserConfig;
});
