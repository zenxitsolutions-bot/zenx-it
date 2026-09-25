export function assertIntegrationTestsEnabled(environment = process.env) {
  if (environment.RUN_INTEGRATION_TESTS !== '1' || environment.NODE_ENV === 'production') {
    throw new Error('Database integration tests are disabled. Use a dedicated test database, set RUN_INTEGRATION_TESTS=1, and never run against production.');
  }
}
