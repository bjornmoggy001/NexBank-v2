import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        pool: 'forks',
        maxWorkers: 1,
        isolate: false,
        setupFiles: ['./src/tests/setup.ts'],
    },
})