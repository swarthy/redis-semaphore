import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import nodePlugin from 'eslint-plugin-node'

export default [
  {
    ignores: ['lib/**', 'es/**', 'coverage/**', '.nyc_output/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: false
        }
      },
      globals: {
        console: true,
        process: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      ...typescript.configs['recommended'].rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-unused-expressions': 'off'
    }
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        describe: true,
        it: true,
        before: true,
        after: true,
        beforeEach: true,
        afterEach: true,
        mocha: true
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-unused-vars': 'off'
    }
  }
]
