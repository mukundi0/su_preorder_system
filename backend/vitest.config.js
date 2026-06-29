import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        globalSetup: './tests/globalSetup.js',
        setupFiles: ['./tests/setup.js'],
        testTimeout: 30000,
        fileParallelism: false, // run test files one at a time to share the in-memory DB safely
        env: {
            SECRET_KEY: 'test-jwt-secret-key-for-testing-only',
            NODE_ENV: 'test',
            FRONTEND_URL: 'http://localhost:5173',
        }
    }
})
