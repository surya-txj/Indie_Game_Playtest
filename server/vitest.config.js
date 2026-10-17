import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/playtest-test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    },
  },
});
