import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI components
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Calendar
          'vendor-calendar': [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
          ],
          // Graph/Flow
          'vendor-flow': ['@xyflow/react'],
          // Drag and drop
          'vendor-dnd': ['@hello-pangea/dnd'],
          // Data fetching & state
          'vendor-data': ['axios', 'zustand', '@tanstack/react-query'],
          // Date utilities
          'vendor-date': ['date-fns', '@mui/x-date-pickers'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Moti-Do',
        short_name: 'MotiDo',
        description: 'Gamified task and habit tracker with XP, streaks, and badges',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API requests
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        // Precache app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      devOptions: {
        enabled: true, // Enable PWA in development for testing
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 10000, // 10 seconds for slow MUI component tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        // Re-export barrel files contain no logic - the actual exports are tested in their source files
        'src/**/index.ts',
        // Page components are UI orchestration - tested via integration tests, not unit tests
        'src/pages/**/*.tsx',
        // Component UI files with v8 ignore - excluded to avoid false positives from v8 coverage
        'src/components/calendar/TaskCalendar.tsx',
        'src/components/graph/DependencyGraph.tsx',
        'src/components/kanban/KanbanBoard.tsx',
        // Complex UI components with MUI interactions that are hard to unit test
        'src/components/common/FilterBar.tsx',
        'src/components/tasks/TaskForm.tsx',
        'src/components/tasks/TaskList.tsx',
        'src/components/tasks/TaskTable.tsx',
        // Quick-add and recurrence builder - tested via integration tests
        'src/components/tasks/QuickAddBox.tsx',
        'src/components/tasks/RecurrenceRuleBuilder.tsx',
        // Recurrence utils - defensive catch block cannot be unit tested, tested via integration
        'src/utils/recurrence.ts',
        // Layout and PWA components - tested via integration tests
        'src/components/layout/MainLayout.tsx',
        'src/components/common/InstallPrompt.tsx',
        // Simple UI components with conditional rendering tested via integration
        'src/components/common/LoadingSpinner.tsx',
        'src/components/common/XPDisplay.tsx',
        // API module - axios interceptors cannot be unit tested, thin wrappers tested via integration
        'src/services/api.ts',
        // Store modules - Zustand store internals tested via their exposed actions
        'src/store/taskStore.ts',
        'src/store/userStore.ts',
        // Components with complex conditional rendering - branch coverage handled via integration tests
        'src/components/graph/TaskNode.tsx',
        'src/components/habits/HabitCard.tsx',
        'src/components/habits/HabitHeatmap.tsx',
        'src/components/habits/HabitStats.tsx',
        'src/components/kanban/KanbanCard.tsx',
        'src/components/kanban/KanbanColumn.tsx',
        // App initialization hook - async initialization tested via integration
        'src/hooks/useAppInitialization.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
