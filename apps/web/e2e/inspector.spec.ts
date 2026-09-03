import { test } from '@playwright/test';
import * as fs from 'fs';

test('Deep Inspection of all pages and data', async ({ page }) => {
  test.setTimeout(90000);
  let logOutput = '';
  const log = (msg: string) => {
    logOutput += msg + '\n';
  };

  const requests: string[] = [];
  const responses: string[] = [];
  const consoleLogs: string[] = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('request', req => requests.push(`${req.method()} ${req.url()}`));
  page.on('response', async res => {
    let body = '';
    try {
      if (res.url().includes('/api/')) {
        body = await res.text();
      }
    } catch {}
    responses.push(`${res.status()} ${res.url()} ${body.slice(0, 150)}`);
  });

  log('\n=================== 1. OVERVIEW PAGE (/) ===================');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const overviewText = await page.innerText('main');
  log('--- Overview main text: ---\n' + overviewText);

  log('\n=================== 2. RECOVERY CASES (/recovery-cases) ===================');
  await page.goto('/recovery-cases', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const casesText = await page.innerText('main');
  log('--- Recovery cases main text: ---\n' + casesText);

  log('\n=================== 3. APPROVALS (/approvals) ===================');
  await page.goto('/approvals', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const approvalsText = await page.innerText('main');
  log('--- Approvals main text: ---\n' + approvalsText);

  log('\n=================== 4. BATCHES (/batches) ===================');
  await page.goto('/batches', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const batchesText = await page.innerText('main');
  log('--- Batches main text: ---\n' + batchesText);

  log('\n=================== 5. POLICIES (/policies) ===================');
  await page.goto('/policies', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const policiesText = await page.innerText('main');
  log('--- Policies main text: ---\n' + policiesText);

  log('\n=================== 6. AUDIT LOG (/audit-log) ===================');
  await page.goto('/audit-log', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const auditText = await page.innerText('main');
  log('--- Audit Log main text: ---\n' + auditText);

  log('\n=================== 7. DIRECTION 01 (/directions/payment-degradation) ===================');
  await page.goto('/directions/payment-degradation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const dir1Text = await page.innerText('main');
  log('--- Direction 1 main text: ---\n' + dir1Text);

  log('\n=================== 8. CASE DETAIL (/recovery-cases/[id]) ===================');
  await page.goto('/recovery-cases', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const firstCaseLink = page.locator('table tbody tr a').first();
  if (await firstCaseLink.isVisible()) {
    const caseIdHref = await firstCaseLink.getAttribute('href');
    log('Clicking Case Link: ' + caseIdHref);
    await firstCaseLink.click();
    await page.waitForTimeout(2000);
    const detailText = await page.innerText('main');
    log('--- Case Detail main text: ---\n' + detailText);
  }

  log('\n=================== API RESPONSES ===================');
  log(responses.filter(r => r.includes('/api/')).join('\n'));

  log('\n=================== CONSOLE LOGS ===================');
  log(consoleLogs.join('\n'));

  fs.writeFileSync('/Users/bhaveshmore/.gemini/antigravity/brain/ea2d56b5-d36e-42d3-a4c0-537ffc66f319/scratch/inspection_output.txt', logOutput);
});
