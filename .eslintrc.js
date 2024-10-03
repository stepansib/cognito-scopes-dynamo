module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 2,
    'no-console': 2,
    // 'import/no-extraneous-dependencies': [2, { 'devDependencies': ['jest.config.ts', '**/*.test.ts', '**/*.test.tsx'] }],
    'import/no-extraneous-dependencies': 0,
    'import/prefer-default-export': 0,
    'import/no-default-export': 2,
  },
};
