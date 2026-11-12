// src/ 의 페이지·모델·앱 코드를 합쳐 브라우저에서 바로 여는 index.html 을 만듭니다.
// 사용법: node build.js
const fs = require('fs');
const path = require('path');

const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const model = src('model.js').replace("if (typeof module !== 'undefined') module.exports = Model;", '');
const app = src('app.js');
let page = src('page.html')
  .replace('/*__MODEL__*/', () => model)
  .replace('/*__APP__*/', () => app)
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');

const cut = page.indexOf('<div class="wrap">');
const head = page.slice(0, cut).trim();
const body = page.slice(cut).trim();

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
