// Install the Chromium revision shipped with the pinned Playwright package.
// Both gate jobs use this preflight, including the final launch after a repair.
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');
const manifest = require('playwright/package.json');

async function probe() {
  const browser = await chromium.launch();
  try {
    console.log('Gate browser: Playwright %s / Chromium %s', manifest.version, browser.version());
  } finally {
    await browser.close();
  }
}

async function main() {
  if (manifest.version !== process.env.GATE_PLAYWRIGHT_VERSION) {
    throw new Error('Installed Playwright does not match the gate version pin');
  }
  const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
  const install = command => execFileSync(process.execPath, [cli, command, 'chromium'], { stdio: 'inherit' });
  install('install');
  try {
    await probe();
  } catch (error) {
    if (process.platform !== 'linux' ||
        !/missing dependencies|error while loading shared libraries|cannot open shared object file/i.test(error.message)) {
      throw error;
    }
    console.error('Missing Chromium system dependencies:', error.message);
    install('install-deps');
    await probe();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
