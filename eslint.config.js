import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '*.config.js', '*.config.ts', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Allow console.log, console.error, etc. for debugging and error logging
      'no-console': 'off',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      // Allow any type when needed for flexibility (common in D3, CSV parsing, etc.)
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertions when we know better than TypeScript
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow empty functions for placeholder handlers
      '@typescript-eslint/no-empty-function': 'off',
      // Be more lenient with React hooks dependencies for stable callbacks
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)