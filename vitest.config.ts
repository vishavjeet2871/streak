import { defineConfig } from 'vitest/config';

// Run the suite in India Standard Time so day-boundary tests exercise a
// non-UTC zone. Worker processes inherit this before any Date is created.
process.env.TZ = 'Asia/Kolkata';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
