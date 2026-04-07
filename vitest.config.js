import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
    include: ['__tests__/**/*.test.{js,jsx}'],
    alias: {
      '\\.(css|less|scss|sass)$': './__mocks__/styleMock.js',
    },
  },
});
