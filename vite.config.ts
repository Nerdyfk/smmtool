import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
        },
      },
    },
    plugins: [
      {
        name: 'copy-static-assets',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          for (const dir of ['js', 'css', 'admin']) {
            const src = path.resolve(__dirname, dir);
            const dest = path.resolve(distDir, dir);
            if (fs.existsSync(src)) {
              fs.cpSync(src, dest, { recursive: true });
            }
          }
          for (const file of ['robots.txt', 'sitemap.xml']) {
            const src = path.resolve(__dirname, file);
            const dest = path.resolve(distDir, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          }
        },
      },
    ],
  };
});
