import dns from 'node:dns';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';

dns.setDefaultResultOrder('verbatim');

export default defineConfig({
    build: {
        outDir: 'dist',
    },
    plugins: [
        react(),
        svgr(),
        checker({ typescript: { buildMode: true } }),
        process.env.BUNDLE_ANALYZE ? visualizer({ open: true }) : null,
    ],
    resolve: {
        conditions: ['require'],
        preserveSymlinks: true,
        alias: {
            // This is the only way I could get the build to work.
            // Without this line the app crashes in runtime with:
            // https://github.com/TanStack/query/discussions/1461
            // The problem is that in runtime we have two different
            // context for the same module.
            '@tanstack/react-query': path.resolve('../../../node_modules/@tanstack/react-query/build/lib/index.js'),
        },
    },
    server: {
        port: 3001,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                secure: false,
                prependPath: false,
            },
        },
    },
});
