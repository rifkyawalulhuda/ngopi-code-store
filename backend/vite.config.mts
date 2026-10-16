import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dashboard',
  build: {
    outDir: join(__dirname, 'dist/dashboard'),
    // Wipe stale assets on every build. Without this, hashed bundles from
    // previous builds accumulate and an index.html can end up referencing a
    // chunk that no longer exists (blank dashboard).
    emptyOutDir: true,
  },
  plugins: [
    vendureDashboardPlugin({
      vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
      // 'auto' derives the API origin from window.location at runtime, so a
      // single build works on localhost, a LAN IP, and the public domain.
      // This must NOT be a baked host: the dashboard is a static bundle, and a
      // hardcoded host/port breaks whenever the backend port or domain changes.
      api: { host: 'auto', port: 'auto' },
      gqlOutputPath: './src/gql',
    }),
  ],
  resolve: {
    alias: {
      '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
    },
  },
});
