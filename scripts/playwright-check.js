const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = process.env.BASE_URL || process.env.RAILWAY_URL || 'https://chat-interface-production-9252.up.railway.app';
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const status = resp && typeof resp.status === 'function' ? resp.status() : 0;
  const title = await page.title().catch(() => '');
  console.log(JSON.stringify({ url, status, title }));
  await browser.close();
  if (!status || status >= 400) process.exit(1);
})().catch(err => { console.error(err); process.exit(1); });
