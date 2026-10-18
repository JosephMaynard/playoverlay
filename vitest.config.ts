import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { sharedDefine, sharedResolve } from './vite.shared.config';

export default defineConfig({
  plugins: [react()],
  define: sharedDefine,
  resolve: sharedResolve,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // The workspace packages are part of the app (they ship inside it), so
      // they count towards its coverage the same as src/.
      include: ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'packages/*/src/**/*.test.{ts,tsx}',
        'src/main.ts',
        'src/preload.ts',
        'src/renderer.ts',
        'src/renderer-display.ts',
      ],
    },
  },
});
