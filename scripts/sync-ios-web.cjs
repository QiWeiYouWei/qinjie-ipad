const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), dest = path.join(root, 'ios', 'Web');
const assets = ['index.html','style.css','app.js','core.js','content.js','teaching.js','repertoire.js','notation.js','audio.js','library.js'];
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
function transform(name, text) {
  if (name === 'index.html') return text.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`);
  if (name === 'app.js') {
    const replacements = [
      ['琴阶 1.4 · Android 8.0及以上', '琴阶 1.4 · iPadOS 16及以上'],
      ['当前系统不支持音频，请更新Android System WebView', '当前系统不支持音频，请更新iPadOS并重启应用']
    ];
    for (const [before, after] of replacements) {
      if (!text.includes(before)) throw Error(`iPad platform text needs updating: ${before}`);
      text = text.replace(before, after);
    }
  }
  return text;
}
function sync() {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of assets) fs.writeFileSync(path.join(dest, name), transform(name, fs.readFileSync(path.join(root, 'web', name), 'utf8')));
  console.log(`Synced ${assets.length} offline web assets to ios/Web`);
}
if (require.main === module) sync();
module.exports = { assets, csp, transform, sync };
