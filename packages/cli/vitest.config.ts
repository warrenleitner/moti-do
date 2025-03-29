import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Makes Jest-like globals (describe, it, expect) available
    environment: 'node', // Specify node environment for backend tests
    // You can add more configurations here (e.g., coverage)
  },
}); 