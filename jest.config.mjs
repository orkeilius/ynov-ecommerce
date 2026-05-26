export default {
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',       // server entry-point — not unit-testable
    '!src/data/**',        // legacy flat-file fixtures, superseded by the db
    '!src/db/seed.js',     // one-shot CLI seed script
  ],
  coverageThreshold: {
    global: {
      branches:   70,
      functions:  80,
      lines:      80,
      statements: 80,
    },
  },
};
