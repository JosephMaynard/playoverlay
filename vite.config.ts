import { defineConfig, PluginOption } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
const { resolve } = require('path');

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'display.html'),
      },
    },
  },
  plugins: [reactRefresh() as PluginOption],
});
