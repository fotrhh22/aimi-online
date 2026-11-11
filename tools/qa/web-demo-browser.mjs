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
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port);
 await page.getByRole('button',{name:'공지',exact:true}).waitFor({timeout:65000});
 assert.equal(await page.locator('html').getAttribute('data-aimi-host'),'browser');
 assert.equal(await page.getByRole('button',{name:'토스로 시작하기'}).count(),0);
 await page.getByRole('navigation').getByRole('button',{name:'소셜',exact:true}).click();
 await page.getByText('친구들과 함께',{exact:true}).waitFor();
 await page.getByRole('button',{name:/모모/}).first().click();
 await page.getByRole('heading',{name:'친구 정원',exact:true}).waitFor();
 await page.getByText('누적 성공',{exact:true}).waitFor();
 await page.reload();
 await page.getByRole('button',{name:'공지',exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:/프롬프트 개선기/}).click();
 await page.getByRole('textbox').fill('학교 발표를 준비해줘.');
 assert.equal(await page.getByRole('textbox').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)),16);
 await mkdir('output/qa/web-demo',{recursive:true});await page.screenshot({path:'output/qa/web-demo/optimizer.png'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,automaticSession:true,webNavigation:true,friendVisit:true,refresh:true,input16px:true,realGeminiRequest:false,stateReset:false}));
}finally{await browser.close();server.closeAllConnections();server.close();}
