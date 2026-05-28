/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['<rootDir>/ts-jest-transformer.js', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@plugins/(.*)$': '<rootDir>/src/plugins/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/migrations/**',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
};
