import { test, expect } from '@playwright/test';
import { version } from '../../package.json';

// Helper function to get the correct port for each test instance
const getPort = (testInfo: any) => {
  return testInfo.project.name === 'grafana-oss' ? '3001' : '3000';
};

test.describe('Check version', () => {
    test('check version', async ({ page }, testInfo) => {
        const port = getPort(testInfo);
        
        // Wait for all network connections to be completed
        await page.goto(`http://localhost:${port}/plugins/grafana-duckdb-datasource`, {
            waitUntil: 'networkidle'
        });
        
        // You can also check the network activity
        await page.waitForLoadState('networkidle');
        
        await expect(page.getByText(`Version${version}`)).toBeVisible({ timeout: 2000 });
    })
})

// test.describe('DuckDB Parallel Tests', () => {
//   test('basic query test', async ({ page }, testInfo) => {
//     const port = getPort(testInfo);
    
//     // Navigate to explore
//     await page.goto(`http://localhost:${port}/explore`);
    
//     // Select DuckDB datasource
//     await page.click('[data-testid="data-source-picker"]');
//     await page.getByRole('textbox').fill('DuckDB');
//     await page.getByText('DuckDB').click();
    
//     // Execute test query
//     const query = 'SELECT 1 as value';
//     await page.fill('[data-testid="query-editor"]', query);
//     await page.click('[data-testid="run-query"]');
    
//     // Verify results
//     await expect(page.getByText('1')).toBeVisible();
//   });

//   test('datasource configuration test', async ({ page }, testInfo) => {
//     const port = getPort(testInfo);
    
//     await page.goto(`http://localhost:${port}/datasources/new`);
//     await page.getByRole('textbox', { name: 'Search for data source' }).fill('DuckDB');
//     await page.getByRole('link', { name: /DuckDB/i }).click();
    
//     await page.fill('[data-testid="datasource-config-path"]', '/data/test.db');
//     await page.click('button[type="submit"]');
    
//     await page.click('[data-testid="test-datasource"]');
//     await expect(page.getByText('Data source is working')).toBeVisible();
//   });
// }); 