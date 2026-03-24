import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

// Auto-increment filename
let n = 1;
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}${label ? '-' + label : ''}.png`))) n++;
const filename = `screenshot-${n}${label ? '-' + label : ''}.png`;
const outputPath = path.join(screenshotDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

const makeVisible = () => page.evaluate(() => {
  document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
});

const snapAnchor = async (suffix, anchor) => {
  const p = outputPath.replace('.png', `-${suffix}.png`);
  await page.goto(anchor ? `${url}#${anchor}` : url, { waitUntil: 'networkidle2' });
  await makeVisible();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: p, fullPage: false });
};

// Viewport shots using anchor nav (avoids window.scrollTo cap bug)
await snapAnchor('viewport', null);
await snapAnchor('mid', null); // will scroll via JS for mid
// Override mid: scroll to problem section
await page.evaluate(() => window.scrollTo(0, 900));
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: outputPath.replace('.png', '-mid.png'), fullPage: false });

await snapAnchor('pricing', 'pricing');
await snapAnchor('guarantee', 'contact'); // no guarantee anchor, use contact proximity
await snapAnchor('casestudies', 'case-studies');
await snapAnchor('about', 'about');

// Full page last
await page.goto(url, { waitUntil: 'networkidle2' });
await makeVisible();
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);
