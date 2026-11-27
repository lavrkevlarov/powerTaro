#!/usr/bin/env node
/* Сборка: склеивает index.html, CSS, JS и иконку в один файл dist/taro.html.
   Запуск: node build.js            → dist/taro.html (открывается двойным щелчком)
           node build.js --embed X  → X: версия без <html>/<head>/<body> для встраивания */
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const args = process.argv.slice(2);
const embedIdx = args.indexOf('--embed');
const embedOut = embedIdx >= 0 ? args[embedIdx + 1] : null;

let html = read('index.html');

// стили
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/, (_, href) => `<style>\n${read(href)}\n</style>`);

// скрипты
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = read(src);
  if (/<\/script/i.test(code)) throw new Error(`В ${src} встречается </script>`);
  return `<script>\n${code}\n</script>`;
});

// иконка как data URI; манифест и service worker в одном файле не нужны
const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icons/icon.svg')).toString('base64');
html = html
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}" type="image/svg+xml">`)
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '');

const unresolved = html.match(/(?:src|href)="(?:js|css|icons)\/[^"]*"/g);
if (unresolved) throw new Error('Остались внешние ссылки: ' + unresolved.join(', '));

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/taro.html'), html);
console.log(`dist/taro.html — ${(Buffer.byteLength(html) / 1024).toFixed(1)} КБ`);

if (embedOut) {
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1]
    .replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  fs.writeFileSync(embedOut, head.trim() + '\n' + body.trim() + '\n');
  console.log(`${embedOut} — версия для встраивания`);
}
