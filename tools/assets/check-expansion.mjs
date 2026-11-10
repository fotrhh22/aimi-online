/** Offline render/metadata verification, not browser/UI verification. */
import {Resvg} from '@resvg/resvg-js';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {EXPANSION_CATALOG,GARDEN_ITEM_GEOMETRY,clampGardenPlacement,gardenPlacementInBounds} from '@aimi/contracts';
const root=new URL('../../',import.meta.url), pub=new URL('apps/miniapp/public/content/',root);
const checks=[];
for(const item of EXPANSION_CATALOG){
 const source=await readFile(new URL(item.asset+'.svg',pub),'utf8');
 assert.ok(!source.includes('<script') && !source.includes('href='));
 const rendered=new Resvg(source,{font:{loadSystemFonts:false}}).render();
 assert.ok(rendered.pixels.some((value,index)=>index%4===3&&value>0),item.id+' is empty');
 if(item.kind==='item'){
  const {viewBox:v}=GARDEN_ITEM_GEOMETRY[item.id];
  const cropped=await readFile(new URL('garden/'+item.asset+'.svg',pub),'utf8');
  assert.ok(cropped.includes('viewBox="'+v.join(' ')+'"'));
  for(let y=0;y<rendered.height;y++)for(let x=0;x<rendered.width;x++){
   if(rendered.pixels[(y*rendered.width+x)*4+3]>0)
    assert.ok(x>=v[0]-1 && x<=v[0]+v[2] && y>=v[1]-1 && y<=v[1]+v[3],item.id+' clipped art');
  }
  for(const x of [-1,0,.5,1,2])for(const y of [-1,0,.5,1,2])assert.ok(gardenPlacementInBounds(clampGardenPlacement({itemId:item.id,x,y})));
 }
 checks.push({id:item.id,rendered:true,tightBounds:item.kind==='item'});
}
await writeFile(new URL('output/assets/shop-v1/validation.json',root),JSON.stringify({offlineRender:true,items:checks},null,2));
console.log('40 SVG assets rendered; 30 placement bounds verified.');
