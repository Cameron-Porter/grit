const puppeteer = require('puppeteer');
const path = require('path');

const SIZE = 1024;

// Icon: G.R.I.T. wordmark only (square)
const iconHtml = `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${SIZE}px;
      height: ${SIZE}px;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo {
      display: flex;
      align-items: center;
      transform: scaleX(1.38);
      transform-origin: center;
    }
    .letter {
      font-family: 'Exo 2', sans-serif;
      font-weight: 800;
      font-size: 248px;
      color: #FFFFFF;
      line-height: 1;
      letter-spacing: -6px;
    }
    .dot {
      width: 30px;
      height: 30px;
      background: #14B8A6;
      flex-shrink: 0;
      margin-top: 50px;
      margin-left: 1px;
      margin-right: 1px;
    }
  </style>
</head>
<body>
  <div class="logo">
    <span class="letter">G</span><div class="dot"></div>
    <span class="letter">R</span><div class="dot"></div>
    <span class="letter">I</span><div class="dot"></div>
    <span class="letter">T</span><div class="dot"></div>
  </div>
</body>
</html>`;

// Splash/login banner: G.R.I.T. + subtitle (wide format)
const BANNER_W = 1536;
const BANNER_H = 768;
const bannerHtml = `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${BANNER_W}px;
      height: ${BANNER_H}px;
      background: #060606;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 28px;
      overflow: hidden;
    }
    .logo {
      display: flex;
      align-items: center;
      transform: scaleX(1.22);
      transform-origin: center;
    }
    .letter {
      font-family: 'Exo 2', sans-serif;
      font-weight: 800;
      font-size: 200px;
      color: #FFFFFF;
      line-height: 1;
      letter-spacing: -4px;
    }
    .dot {
      width: 26px;
      height: 26px;
      background: #14B8A6;
      flex-shrink: 0;
      margin-top: 26px;
      margin-left: 2px;
      margin-right: 2px;
    }
    .subtitle {
      font-family: 'Exo 2', sans-serif;
      font-weight: 700;
      font-size: 26px;
      color: #14B8A6;
      letter-spacing: 8px;
      text-transform: uppercase;
      transform: scaleX(1.1);
      transform-origin: center;
    }
  </style>
</head>
<body>
  <div class="logo">
    <span class="letter">G</span><div class="dot"></div>
    <span class="letter">R</span><div class="dot"></div>
    <span class="letter">I</span><div class="dot"></div>
    <span class="letter">T</span><div class="dot"></div>
  </div>
  <div class="subtitle">Guided Results &amp; Intelligent Training</div>
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  // Generate icon
  const iconPage = await browser.newPage();
  await iconPage.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
  await iconPage.setContent(iconHtml, { waitUntil: 'networkidle0' });
  await iconPage.waitForFunction(() => document.fonts.ready);
  await iconPage.screenshot({ path: path.join(__dirname, '..', 'assets', 'images', 'icon.png'), clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  console.log(`✓ assets/images/icon.png (${SIZE}×${SIZE})`);

  // Generate banner
  const bannerPage = await browser.newPage();
  await bannerPage.setViewport({ width: BANNER_W, height: BANNER_H, deviceScaleFactor: 1 });
  await bannerPage.setContent(bannerHtml, { waitUntil: 'networkidle0' });
  await bannerPage.waitForFunction(() => document.fonts.ready);
  await bannerPage.screenshot({ path: path.join(__dirname, '..', 'assets', 'images', 'banner.png'), clip: { x: 0, y: 0, width: BANNER_W, height: BANNER_H } });
  console.log(`✓ assets/images/banner.png (${BANNER_W}×${BANNER_H})`);

  await browser.close();
})();
