import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['node_modules', 'test-results', 'playwright-report', 'playwright/.auth', 'eslint.config.mjs', 'rwa-app/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // THE flake killer: every un-awaited Playwright call becomes an error.
      // This is type-aware — it must know the expression is a Promise.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // In TEST files, a non-null assertion after an explicit expect(x).toBeDefined()
    // is idiomatic and safe: the assertion already failed the test if x were null.
    // We keep the rule as an ERROR in framework code (pages/, utils/, config/),
    // where silent assumptions are genuinely dangerous.
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error', // bans sleeps outright
      'playwright/no-force-option': 'error',
      'playwright/expect-expect': 'error', // every test must assert something
    },
  },
  prettier, // LAST — disables formatting rules that would fight Prettier
);
