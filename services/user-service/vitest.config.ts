import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    env: {
      USER_DB_URL: 'postgres://test:test@localhost:5432/test',
      INTERNAL_API_TOKEN: 'test-internal-api-token-32-characters',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
