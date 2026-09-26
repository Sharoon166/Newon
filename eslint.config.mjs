import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Pin the React version: eslint-plugin-react auto-detection uses
  // `context.getFilename()`, which ESLint 10 removed.
  { settings: { react: { version: '19.2' } } },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts']
  }
];

export default eslintConfig;
