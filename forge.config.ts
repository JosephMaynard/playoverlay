import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { execSync } from 'node:child_process';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'src/assets/appIcon',
    appBundleId: 'com.playoverlay.app',
    // The deb/rpm makers expect a lowercase binary matching the package
    // name; without this the packaged binary is "PlayOverlay" and the Linux
    // makers fail to find it ("could not find the Electron app binary").
    executableName: 'playoverlay',
    // Ship the project licence, the trademark terms, and the bundled
    // third-party dependency notices alongside the app so an installed copy
    // carries its own licensing, not just the source repository.
    extraResource: ['LICENSE', 'TRADEMARKS.md', 'THIRD_PARTY_NOTICES.md'],
  },
  hooks: {
    // Regenerate THIRD_PARTY_NOTICES.md from the current production
    // dependency tree right before packaging, so the bundled notices can
    // never drift from what actually ships. If the generator is unavailable
    // (e.g. dev dependencies were not installed), fall back to the committed
    // copy rather than failing the whole build.
    generateAssets: async () => {
      try {
        execSync(
          'npx --no-install generate-license-file --input package.json --output ./THIRD_PARTY_NOTICES.md --overwrite',
          { stdio: 'inherit' }
        );
      } catch (error) {
        console.warn(
          'Could not regenerate THIRD_PARTY_NOTICES.md, using the committed copy:',
          error
        );
      }
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
        {
          name: 'display_window',
          config: 'vite.renderer-display.config.ts',
        },
      ],
    }),
  ],
};

export default config;
