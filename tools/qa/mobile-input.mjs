import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const css=['tokens','styles','layout'].map(n=>readFileSync(`apps/miniapp/src/${n}.css`,'utf8')).join('\n');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:393,height:852}});
 await page.route('**/*',r=>r.abort());
 await page.setContent(`<style>${css}</style><div id="root"><textarea class="prompt-input" style="font-size:12px">한글 입력</textarea><div class="model-panel"><input placeholder="검색"></div><label class="model-profile-label"><select><option>비율</option></select></label><input type="number"><div contenteditable="true">편집</div><button>확인</button></div>`);
 const values=await page.locator('input,textarea,select,[contenteditable]').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,size:parseFloat(getComputedStyle(n).fontSize)})));
 assert.ok(values.every(n=>n.size>=16),JSON.stringify(values));
 assert.equal(await page.locator('button').evaluate(n=>getComputedStyle(n).touchAction),'manipulation');
 console.log(JSON.stringify({passed:true,editableTypes:values,realIOSFocusZoomTest:false}));
}finally{await browser.close();}
