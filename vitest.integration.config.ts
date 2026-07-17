import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

const environment = loadEnv('test', process.cwd(), '');
Object.assign(process.env, environment);

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
  },
});
