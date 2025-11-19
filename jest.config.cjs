// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime|@dnd-kit|@floating-ui|@radix-ui|@react-aria|@react-stately|@react-types|@tanstack|d3-array|d3-color|d3-format|d3-interpolate|d3-path|d3-scale|d3-shape|d3-time|d3-time-format|internmap|react-dnd|react-dnd-html5-backend|react-dnd-touch-backend|react-markdown|rehype-raw|rehype-sanitize|rehype-slug|remark-gfm|swiper|swiper/react|uuid|@babel/runtime/.*))'
  ],
};

// ✅ CommonJS export
module.exports = createJestConfig(customJestConfig);
