module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:n8n-nodes-base/recommended',
  ],
  rules: {
    'n8n-nodes-base/node-param-description-missing-for-ignore-ssl-issues': 'off',
    'n8n-nodes-base/node-param-description-wrong-for-dynamic-options': 'off',
    'n8n-nodes-base/node-param-description-missing-from-dynamic-options': 'off',
    'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};