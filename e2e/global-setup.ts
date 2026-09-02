// Global setup for e2e tests
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Wait for the server to be ready
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
  
  // Simple health check
  try {
    const response = await fetch(baseURL);
    if (!response.ok) {
      console.warn(`Server at ${baseURL} returned ${response.status}`);
    }
  } catch (e) {
    console.warn(`Could not reach server at ${baseURL}. Make sure it's running.`);
  }
}

export default globalSetup;
