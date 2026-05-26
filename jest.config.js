/** @type {import('jest').Config} */
const config = {
    coverageThreshold: {
        global: {
            branches: 20, // for testing
            functions: 20,
            lines: 20,
            statements: -100
        }
    }
};

module.exports = config;
