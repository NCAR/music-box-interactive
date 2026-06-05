import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    pool: 'vmForks',
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
    include: ['__tests__/**/*.test.{js,jsx}'],
  },
});
