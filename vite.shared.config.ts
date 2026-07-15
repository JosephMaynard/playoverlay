import { resolve } from 'node:path';

export const sharedDefine = {
  __LEGACY_STORE_KEY__: JSON.stringify(''),
};

export const sharedResolve = {
  alias: {
    src: resolve(__dirname, 'src'),
  },
};
