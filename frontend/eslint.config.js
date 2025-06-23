import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['coverage/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        alert: 'readonly',
        URLSearchParams: 'readonly',
        process: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly'
      }
    },
    plugins: { react: reactPlugin },
    settings: {
      react: {
        version: '19.1.0'
      }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'react/prop-types': 'off'
    }
  },
  {
    files: ['**/*.test.js', '**/*.test.jsx', 'jest.config.js', 'jest.setup.js'],
    ignores: ['coverage/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        global: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        window: 'readonly',
        Storage: 'readonly',
        setTimeout: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        localStorage: 'readonly',
        console: 'readonly'
      }
    }
  },
  {
    files: ['**/*.config.js', 'postcss.config.js', 'tailwind.config.js', 'next.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly'
      }
    }
  }
]; 