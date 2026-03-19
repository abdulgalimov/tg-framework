import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  dts: {
    sourcemap: true,
  },
  format: 'esm',
  sourcemap: true,
  clean: true,

  hash: false,
  fixedExtension: false,
});
