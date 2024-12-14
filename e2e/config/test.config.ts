import { defineConfig } from '@playwright/test';

// Define test configurations for different Grafana instances
const testInstances = [
  {
    name: 'grafana-prod',
    port: 3000,
    baseURL: 'http://localhost:3000',
  },
//   {
//     name: 'grafana-oss',
//     port: 3001,
//     baseURL: 'http://localhost:3001',
//   },
//   {
//     name: 'grafana-enterprise',
//     port: 3002,
//     baseURL: 'http://localhost:3002',
//   },
];

// Create project configurations for each instance
const projects = testInstances.map((instance) => ({
  name: instance.name,
  use: {
    baseURL: instance.baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
}));

export default defineConfig({
  testDir: '../tests',
  timeout: 30 * 1000,
  workers: 4,
  webServer: {
    command: 'just prod-up',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  // Enable full parallelization
  fullyParallel: true,
  
  // Other existing config...
  
  // You might also want to adjust these for parallel testing
  use: {
    // Increase timeouts for parallel execution
    actionTimeout: 30000,
    navigationTimeout: 30000,
    // This will capture screenshots for all test failures
    screenshot: 'only-on-failure',
    // Capture traces for all tests
    trace: 'retain-on-failure',
  },
  
  // Configure reporter to include screenshots
  reporter: [
    ['html', { open: 'never' }],  // HTML reporter with screenshots
    ['list']  // Console output
  ],
  
  // If you have multiple projects, you can configure workers per project
//   projects: [
//     {
//       name: 'grafana-oss',
//       // project specific settings...
//     },
//     {
//       name: 'grafana-enterprise',
//       // project specific settings...
//     }
//   ]
}); 