import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'node_modules/**',
    'dist-admin/**',
    'server/seed-data.generated.json',
    'public/official-media/**',
    '.tmp/**',
    '.tmp-edge*/**',
    'backend/wordpress/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, __APP_BUILD_DATE__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
