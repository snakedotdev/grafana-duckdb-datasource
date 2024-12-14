import { test, expect, Page } from '@playwright/test';
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

test.describe('DuckDB Setup Works', () => {
    test('config datasource', async ({ page }, testInfo) => {
        const port = getPort(testInfo);
        await page.goto(`http://localhost:${port}/connections/datasources`, {
            waitUntil: 'networkidle'
        });
        let elt = page.getByRole('link', { name: 'duckdb' })
        await elt.click();
        await page.waitForLoadState('networkidle');

        // Option 1: Get the parent element first, then find the input
        const pathSection = page.getByText('Path').locator('..');  // or locator('..') to go up one level
        await pathSection.getByRole('textbox').fill('/grafana-duckdb-datasource/test.db');

        await page.getByTestId('data-testid Data source settings page Save and Test button').click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('Database Connection OK')).toBeVisible();
    })
})

function testColumn(table: string, column: string) {
    return test.describe(`${table} - ${column}`, () => {
        test(`${table} - ${column}`, async ({ page }, testInfo) => {
            const port = getPort(testInfo);
            await page.goto(`http://localhost:${port}/explore`);
            await page.waitForLoadState('networkidle');
            
            await page.getByTestId('data-testid header-table-selector').click();
            await page.getByRole('option', { name: table , exact: true}).click();
            await page.waitForLoadState('networkidle');
            await expect(page.getByTestId('data-testid header-table-selector').getByText(table)).toBeVisible();

            await page.getByTestId('data-testid select-column').click();
            await page.getByRole('option', { name: column , exact: true}).click();
            await expect(page.getByTestId('data-testid select-column').getByText(column)).toBeVisible();

            await page.getByTestId('query-editor-row').getByRole('button', { name: 'Run query' }).click()
            await page.waitForLoadState('networkidle');
            
            // Assert that "No data" is NOT visible, "Table" is visible
            await expect(page.getByText('No data')).not.toBeVisible({ timeout: 2000 });
            await expect(page.getByText('error')).not.toBeVisible({ timeout: 2000 });
            await expect(page.getByRole('heading', { name: 'Table' })).toBeVisible({ timeout: 2000 });
        });

        // After each test, capture screenshot if it failed
        test.afterEach(async ({ page }, testInfo) => {
            if (testInfo.status !== 'passed') {
                await page.screenshot({ 
                    path: `test-results/${testInfo.title}-${testInfo.retry}-afterEach.png`,
                    fullPage: true 
                });
            }
        });
    });
}

test.describe('DuckDB Parallel Tests', () => {
    testColumn('customer', 'c_address')
    testColumn('partsupp', 'test1')
    // testColumn('partsupp', 'test2') BIT not working
    testColumn('partsupp', 'test3')
    testColumn('partsupp', 'test4')
    testColumn('partsupp', 'test5')
    testColumn('partsupp', 'test6')
    testColumn('partsupp', 'test7')
    testColumn('partsupp', 'test8')
    testColumn('partsupp', 'test9')
    testColumn('partsupp', 'test10')
    testColumn('partsupp', 'test11')
    testColumn('partsupp', 'test12')
    testColumn('partsupp', 'test13')
    testColumn('partsupp', 'test14')
    testColumn('partsupp', 'test15')
    testColumn('partsupp', 'test16')
    testColumn('partsupp', 'test17')
    testColumn('partsupp', 'test18')
    testColumn('partsupp', 'test19') // type UHUGEINT is not supported
    testColumn('partsupp', 'test20') // converting NULL to uint32
    testColumn('partsupp', 'test21') // converting NULL to uint16
    testColumn('partsupp', 'test22') // converting NULL to uint8
    testColumn('partsupp', 'test23')
    testColumn('partsupp', 'test24')
})