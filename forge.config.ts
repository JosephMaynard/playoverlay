import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { execSync } from 'node:child_process';

// macOS signing and notarisation. The release workflow imports the Developer
// ID certificate into a throwaway keychain and names it here, with the App
// Store Connect API key as a file path (what @electron/notarize wants) and
// its ids. A build without the keychain (a fork, a local `npm run make`) is
// left unsigned, as it always was.
const signKeychain = process.env.PLAYOVERLAY_SIGN_KEYCHAIN;
const notaryKey = process.env.APPLE_API_KEY;
const notaryKeyId = process.env.APPLE_API_KEY_ID;
const notaryIssuer = process.env.APPLE_API_ISSUER;
if (signKeychain && !(notaryKey && notaryKeyId && notaryIssuer)) {
  // A signed but unnotarised app is still blocked by Gatekeeper, so this is
  // a misconfigured release, not a build worth shipping.
  throw new Error(
    'PLAYOVERLAY_SIGN_KEYCHAIN is set but APPLE_API_KEY, APPLE_API_KEY_ID or APPLE_API_ISSUER is missing'
  );
}
const macSigning = signKeychain
  ? {
      osxSign: {
        keychain: signKeychain,
        // Notarisation requires the hardened runtime, and the hardened
        // runtime needs the entitlements in build/entitlements.mac.plist for
        // V8 to run. The same file goes on every helper in the bundle.
        optionsForFile: () => ({
          hardenedRuntime: true,
          entitlements: 'build/entitlements.mac.plist',
        }),
      },
      osxNotarize: {
        appleApiKey: notaryKey as string,
        appleApiKeyId: notaryKeyId as string,
        appleApiIssuer: notaryIssuer as string,
      },
    }
  : {};

const config: ForgeConfig = {
  packagerConfig: {
    ...macSigning,
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
    // never drift from what actually ships. In CI (where releases are built)
    // a generation failure fails the build rather than silently shipping a
    // stale committed copy; locally it falls back to the committed copy so a
    // developer packaging a one-off build is not blocked.
    generateAssets: async () => {
      try {
        execSync(
          'npx --no-install generate-license-file --input package.json --output ./THIRD_PARTY_NOTICES.md --overwrite',
          { stdio: 'inherit' }
        );
      } catch (error) {
        if (process.env.CI) {
          throw error;
        }
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
