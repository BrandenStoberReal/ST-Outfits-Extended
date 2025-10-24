module.exports = {
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://localhost'
    },
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/**/*.test.{js,jsx}',
        '!src/**/*.spec.{js,jsx}',
        '!**/node_modules/**',
        '!**/vendor/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    testMatch: [
        '<rootDir>/tests/**/*.(test|spec).{js,jsx}',
        '<rootDir>/src/**/*.(test|spec).{js,jsx}'
    ],
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(jquery)/)'
    ]
};