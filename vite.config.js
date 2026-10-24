import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  plugins: [react()],
  // On GitHub Pages the app lives at /REPOSITORY-NAME/.
  // Locally it stays at /. GitHub Actions supplies GITHUB_REPOSITORY automatically.
  base: process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/',
});
