export default {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', 'bin/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/templates/'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
