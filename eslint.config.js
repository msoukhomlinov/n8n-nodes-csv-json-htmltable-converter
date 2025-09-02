import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply TypeScript ESLint recommended rules to TypeScript files
  ...tseslint.configs.recommended.map(config => ({ ...config, files: ['**/*.ts'] })),
  // Ignore build outputs and non-TypeScript configs
  {
    ignores: ['dist/**/*', '**/*.js', '*.json'],
  },
  // Project-specific configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.json'],
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
