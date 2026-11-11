import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
const compile = path => transformSync(readFileSync(path,'utf8'),{loader:'ts',format:'cjs'}).code;
const policy = {exports:{}};
vm.runInNewContext(compile('apps/miniapp/src/lib/safe-area-policy.ts'),{module:policy,exports:policy.exports});
function fixture(hostname) {
 const properties=new Map(),listeners=new Map();let initialReads=0,subscription,unsubscribed=false;
 const root={dataset:{},clientHeight:844,style:{setProperty:(k,v)=>properties.set(k,v)}};
 const events={addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:(k)=>listeners.delete(k)};
 const visual={height:844,...events};
 const document={documentElement:root,activeElement:{matches:()=>false},...events};
 const window={innerHeight:844,visualViewport:visual,...events};
 const module={exports:{}};
 vm.runInNewContext(compile('apps/miniapp/src/lib/safe-area.ts'),{module,exports:module.exports,document,window,location:{hostname},require:name=>name.includes('web-framework')?{SafeArea:{get:()=>{initialReads++;return{top:59,right:0,bottom:34,left:0};},subscribe:({onEvent})=>{subscription=onEvent;return()=>{unsubscribed=true;};}}}:name.includes("runtime")?{tossRuntime:hostname!=="127.0.0.1"}:policy.exports});
 const cleanup=module.exports.installSafeArea();
 return{root,properties,listeners,visual,document,cleanup,get reads(){return initialReads;},get subscribed(){return!!subscription;},get unsubscribed(){return unsubscribed;},change:value=>subscription(value)};
}
const host=fixture('aimi.apps.tossmini.com');
assert.equal(host.reads,1);assert.equal(host.properties.get('--sdk-safe-top'),'59px');assert.equal(host.properties.get('--sdk-safe-bottom'),'34px');
host.change({top:0,right:59,bottom:21,left:59});assert.equal(host.properties.get('--sdk-safe-left'),'59px');assert.equal(host.properties.get('--sdk-safe-top'),'0px');
host.change({top:NaN,right:-5,bottom:Infinity,left:10000});assert.equal(host.properties.get('--sdk-safe-bottom'),'0px');assert.equal(host.properties.get('--sdk-safe-right'),'0px');assert.equal(host.properties.get('--sdk-safe-left'),'400px');
host.document.activeElement.matches=()=>true;host.visual.height=480;host.listeners.get('resize')();assert.equal(host.root.dataset.keyboard,'open');
host.visual.height=844;host.listeners.get('resize')();assert.equal(host.root.dataset.keyboard,'closed');
host.cleanup();assert.equal(host.unsubscribed,true);assert.equal(host.listeners.size,0);
const local=fixture('127.0.0.1');assert.equal(local.reads,0);assert.equal(local.subscribed,false);assert.equal(local.root.dataset.aimiHost,'browser');local.cleanup();
console.log('Safe area runtime: initial host read, four-side updates, invalid insets, keyboard, cleanup and local fallback passed.');
