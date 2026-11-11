import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {proxyDemo} from '../../api/demo.js';
const root=resolve('apps/miniapp/dist');
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){
  const chunks=[];for await(const c of req)chunks.push(c);
  try{req.body=chunks.length?JSON.parse(Buffer.concat(chunks)):{};}catch{res.writeHead(400).end();return;}
  const send={setHeader:(k,v)=>res.setHeader(k,v),status(n){res.statusCode=n;return this;},json(v){res.setHeader('content-type','application/json');res.end(JSON.stringify(v));}};
  return proxyDemo(req,send);
 }
 const file=resolve(root,'.'+path);
 if(!file.startsWith(root+'/') && file!==root){res.writeHead(404).end();return;}
 try{const body=await readFile(file);res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.html':'text/html'})[extname(file)]||'application/octet-stream');res.end(body);}
 catch{res.setHeader('content-type','text/html');res.end(await readFile(root+'/index.html'));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{

 const page=await browser.newPage({viewport:{width:393,height:852}});
 await page.goto('http://127.0.0.1:'+port);
 await page.getByRole('button',{name:'공지',exact:true}).waitFor({timeout:65000});
 let release;
 const held=new Promise(r=>release=r);
 await page.route('**/api/demo/daily-rewards/attendance/claim',async route=>{await held;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{awarded:5}})});});
 const clicked=Date.now();
 await page.getByRole('button',{name:/출석하기|출석 완료/}).click();
 await page.getByRole('dialog').getByText('출석을 확인하고 있어요.').waitFor({timeout:1500});
 const pendingShownMs=Date.now()-clicked;
 assert.equal(await page.getByRole('dialog').getByText('+5 EP',{exact:true}).count(),0);
 release();
 await page.getByRole('dialog').getByText('+5 EP',{exact:true}).waitFor({timeout:3000});
 const primaryHTML=await page.locator('.reward-dialog .aimi-button').evaluate(n=>n.outerHTML);
 await page.getByRole('dialog').getByRole('button',{name:'확인',exact:true}).click();
 const labels=['15예산 쓰기','저장하기','다시 시도하기','다시 확인','선택하기','구매하기','친구 삭제','취소'];
 let cases=0;
 for(const width of [320,360,393,480]){
  await page.setViewportSize({width,height:852});
  await page.evaluate(({labels,primaryHTML})=>{
   const d=document.createElement('dialog');d.className='overlay popup-qa';
   d.innerHTML='<div class="dialog-heading"><h2>변경사항을 저장할까요?</h2></div><div class="dialog-body"></div>';
   for(const text of labels){const row=document.createElement('div');row.className='dialog-actions';row.innerHTML=primaryHTML+'<button class="aimi-button weak"><span class="aimi-button-label">취소</span></button>';row.querySelector('.aimi-button-label').textContent=text;d.querySelector('.dialog-body').append(row);}
   document.querySelector('#root').append(d);d.showModal();
  },{labels,primaryHTML});
  await page.evaluate(()=>document.fonts.ready);
  const rows=await page.locator('.popup-qa .aimi-button-label').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,overflow:n.scrollWidth>n.clientWidth+1,height:n.getBoundingClientRect().height})));
  assert.ok(rows.every(r=>!r.overflow && r.height<=23),JSON.stringify({width,rows}));
  cases+=rows.length;
  assert.equal(await page.locator('.popup-qa').evaluate(n=>getComputedStyle(n,'::backdrop').backdropFilter),'none');
  await page.locator('.popup-qa').evaluate(n=>{n.close();n.remove();});
 }
 console.log(JSON.stringify({passed:true,labelCases:cases,pendingShownMs,attendanceResponseHeldUntilPopup:true,claimedBeforeServerReply:false,realRewardMutation:false,realIOS:false}));
}finally{await browser.close();server.closeAllConnections();server.close();}
