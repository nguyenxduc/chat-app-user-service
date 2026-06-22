import path from 'node:path';
import { defineConfig } from 'vitest/config';

// e2e tests run against a real Postgres database reachable on localhost,
// e.g. via `docker compose up -d user-db` from the repo root.
// Self-contained on purpose: works the same locally and in CI service containers.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      USER_DB_URL: 'postgres://chatapp_user:testpassword@localhost:5432/chatapp_user_service',
      INTERNAL_API_TOKEN: 'e2e-test-internal-api-token-16ch',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
