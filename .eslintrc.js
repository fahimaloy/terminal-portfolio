module.exports = {
  plugins: ['prettier'],
  extends: ['next/core-web-vitals'],
  rules: {
    'no-console': 'warn',
    'prettier/prettier': 'warn',
    'react-hooks/exhaustive-deps': 'off',
  },
};
