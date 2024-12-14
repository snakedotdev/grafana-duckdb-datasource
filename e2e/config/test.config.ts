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
  workers: 2,
//   projects,
  webServer: {
    command: 'just prod-up',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
}); 