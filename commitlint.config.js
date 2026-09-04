// commitlint.config.js — Conventional Commits (type(scope): subject)
// Optional deps: @commitlint/cli, @commitlint/config-conventional
// Install when you enable commitlint in CI / Husky commit-msg hook:
//   npm i -D @commitlint/cli @commitlint/config-conventional
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Restrict type to the project allow-list
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'test',
        'chore',
        'perf',
        'ci',
        'build',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'header-max-length': [2, 'always', 100],
    'scope-case': [2, 'always', 'lower-case'],
  },
};
