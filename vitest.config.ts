import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Several suites intentionally stop/start the shared docker-compose redis
    // nodes (quorum failover tests) and all files share the same global redis
    // clients (test/redisClient.ts), so test files must run one at a time.
    fileParallelism: false,
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts', './test/init.ts'],
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov', 'html']
    }
  }
})
