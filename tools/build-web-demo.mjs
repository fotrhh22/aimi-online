// A new deployment only serves a shutdown notice; the Toss build is unaffected.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
const output = "apps/miniapp/dist";
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
writeFileSync(
  output + "/index.html",
  `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMI 테스트 종료</title>
<style>body{margin:0;background:#f1f6e9;color:#244e32;font-family:sans-serif;min-height:100dvh;display:grid;place-items:center}main{padding:32px;max-width:420px}h1{font-size:24px}p{line-height:1.7}</style></head>
<body><main><h1>AIMI 웹 테스트가 종료되었어요</h1><p>참여해주셔서 감사합니다.<br>이 페이지에서는 AI 기능을 더 이상 제공하지 않아요.</p></main></body></html>`,
);
console.log("Retired web demo: static notice only, no JavaScript or API calls");
