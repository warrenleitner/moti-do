module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Ensure Prettier rules don't conflict
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', '**/node_modules/**', '**/dist/**'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Add any project-specific rules here
  },
  settings: {
    react: {
      version: 'detect', // Automatically detect React version
    },
  },
}; 