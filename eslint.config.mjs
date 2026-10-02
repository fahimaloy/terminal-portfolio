import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettierRecommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'no-console': 'warn',
      'prettier/prettier': 'warn',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'prefer-const': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    // Bootstrapped at runtime by `npx gitnexus@latest analyze`, and gitignored
    // (.gitignore `/.gitnexus/`). eslint does not read .gitignore, so without
    // this it lints a 3rd-party artifact that no contributor has in their tree —
    // the lint baseline then depends on whether GitNexus happens to be installed.
    '.gitnexus/**',
  ]),
]);
