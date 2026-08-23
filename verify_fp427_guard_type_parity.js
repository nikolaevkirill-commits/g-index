const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

if (!/dynamicGuard === 'kp_storm' \|\| _daySigQ\.dynamicGuard === 'kp_elevated'/.test(html)) {
  throw new Error('Kp safety banner is not restricted to Kp guard types');
}
if (!/dynamicGuard === 'current_window'[\s\S]{0,800}ПОТОЧНЕ ВІКНО/.test(html)) {
  throw new Error('current-window guard lacks its own typed banner');
}
console.log('PASS Kp banners require kp_elevated/kp_storm');
console.log('PASS Rahu/Yama/Gulika current_window renders as a timing-window guard');
