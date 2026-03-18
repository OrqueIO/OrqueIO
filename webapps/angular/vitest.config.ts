/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    css: false,
    server: {
      deps: {
        inline: [
          '@ngrx/store',
          '@ngrx/effects',
          '@ngrx/entity',
          '@ngrx/store-devtools',
          '@angular/common',
          '@angular/platform-browser',
          '@angular/platform-browser-dynamic',
          '@angular/router',
          '@angular/forms',
          '@angular/core',
          '@fortawesome/angular-fontawesome',
          'zone.js',
        ],
      },
    },
  },
});
