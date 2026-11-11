// Geometry fixtures use the actual shipped CSS in a fresh headless Chrome; no app server or user data.
import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const css=['tokens','styles','layout'].map(n=>readFileSync(`apps/miniapp/src/${n}.css`,'utf8')).join('\n');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const reports=[];
try{
 for(const width of [320,393,480]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/*',r=>r.abort());
  for(const screen of ['home','result','combination','optimizer','garden','models','game']){
   const game=screen==='game';
   await page.setContent(`<html data-aimi-host="toss" style="--sdk-safe-top:59px;--sdk-safe-bottom:34px"><head><style>${css}</style></head><body><div id="root"><div class="app-shell ${game?'game-shell':''}">${game?'':`<header class="screen-head"><h1>${screen==='home'?'AIMI':screen}</h1></header>`}${screen==='home'?'<aside class="test-demo-controls"><span>테스트 계정 · 실제 보상 아님</span><button>테스트 초기화</button></aside>':''}<main class="${game?'game-main':'page '+(screen==='home'?'with-tabs':'')}">${game?'<div class="game-container"><button class="game-pause">Ⅱ</button><div class="game-hud"><span>점수7</span></div><div class="game-controls"><button>←</button><button>→</button></div></div>':'<h2>화면 콘텐츠</h2><p>모바일에서 확인하는 설명이에요.</p><div class="fixed-cta"><button class="aimi-button">다음으로</button></div>'}</main>${screen==='home'?'<nav class="bottom-nav"><button>홈</button><button>정원</button></nav>':''}</div></div></body></html>`);
   const rect=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,bottom:r.bottom,right:r.right,height:r.height};};
    return {shell:box('.app-shell'),first:box(document.querySelector('.game-main')?'.game-main':'.screen-head'),cta:box(document.querySelector('.game-main')?'.game-controls':'.aimi-button'),nav:document.querySelector('.bottom-nav')?box('.bottom-nav'):null,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(rect.first.y>=107,`${width}/${screen}:top`);
   assert.equal(rect.overflow,false,`${width}/${screen}:horizontal overflow`);
   assert.ok(rect.cta.bottom<=844-34,`${width}/${screen}:bottom`);
   if(rect.nav)assert.ok(rect.nav.bottom<=844-34);
   reports.push({width,screen,...rect});
   if(width===393 && ['home','result','game'].includes(screen)) {mkdirSync('output/qa/host-safe-area',{recursive:true});await page.screenshot({path:`output/qa/host-safe-area/${screen}.png`});}
  }
  await page.close();
 }
 writeFileSync('output/qa/host-safe-area/report.json',JSON.stringify(reports,null,2));
 console.log(JSON.stringify({passed:true,geometryCases:reports.length,viewports:[320,393,480],nativeTop:107,bottomInset:34,realTossDeviceTest:false}));
}finally{await browser.close();}
