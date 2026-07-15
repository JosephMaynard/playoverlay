import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart,
} from './vite.base.config';
import { sharedDefine, sharedResolve } from './vite.shared.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const define = {
    ...sharedDefine,
    ...getBuildDefine(forgeEnv),
    __LEGACY_STORE_KEY__: JSON.stringify(process.env.LEGACY_STORE_KEY ?? ''),
  };
  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
      rollupOptions: { external },
    },
    plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      ...sharedResolve,
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
