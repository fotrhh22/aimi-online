/** Read-only public lifecycle/endpoint audit; never makes a completion or generation request. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='data/model-sources/lifecycle/2026-11-10/';await mkdir(root+'endpoints',{recursive:true});
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const original=[...(await read('content/fixtures/models.json')).models,...(await read('content/fixtures/models-media.json')).models];
const get=async path=>{const url=new URL(path,'https://openrouter.ai');if(url.origin!=='https://openrouter.ai')throw Error('UNEXPECTED_ORIGIN');const response=await fetch(url,{signal:AbortSignal.timeout(20000)});return {status:response.status,body:response.ok?await response.json():null,url:String(url)};};
const all=await get('/api/v1/models?output_modalities=all');if(all.status!==200)throw Error('DISCOVERY_FAILED');
while(all.body.links?.next){const next=await get(all.body.links.next);if(next.status!==200)throw Error('DISCOVERY_PAGE_FAILED');all.body.data.push(...next.body.data);all.body.links=next.body.links;}
if(all.body.data.length!==all.body.total_count)throw Error('DISCOVERY_INCOMPLETE');await writeFile(root+'models-all.json',JSON.stringify(all.body,null,2));
const images=await get('/api/v1/images/models'),videos=await get('/api/v1/videos/models');if(images.status!==200||videos.status!==200)throw Error('DEDICATED_DISCOVERY_FAILED');
await writeFile(root+'image-models.json',JSON.stringify(images.body,null,2));await writeFile(root+'video-models.json',JSON.stringify(videos.body,null,2));
const byId=new Map(all.body.data.map(m=>[m.id,m]));const imageById=new Map(images.body.data.map(m=>[m.id,m]));
const scope=original.filter(m=>!m.media||['image','video','audio'].includes(m.media.kind));const queue=[...scope];const checks=[];
await Promise.all(Array.from({length:6},async()=>{while(queue.length){const m=queue.shift();const started=new Date().toISOString();let result;try{
 const endpoint=m.media?.kind==='image'?imageById.get(m.id)?.endpoints:byId.get(m.id)?.links?.details;
 const path=endpoint??'/api/v1/models/'+m.id+'/endpoints';result=await get(path);
 if(result.status===404 && path!=='/api/v1/models/'+m.id+'/endpoints')result=await get('/api/v1/models/'+m.id+'/endpoints');
 const data=result.body?.data??result.body;checks.push({id:m.id,kind:m.media?.kind??'text',checkedAt:started,listed:byId.has(m.id),http:result.status,endpointCount:data?.endpoints?.length??null,url:result.url});
 await writeFile(root+'endpoints/'+m.id.replaceAll('/','__')+'.json',JSON.stringify(result,null,2));
 }catch(e){checks.push({id:m.id,kind:m.media?.kind??'text',checkedAt:started,listed:byId.has(m.id),http:null,endpointCount:null,error:e.message});}
}}));
const report={checkedAt:new Date().toISOString(),generationRequests:0,models:scope.length,checks:checks.sort((a,b)=>a.id.localeCompare(b.id))};await writeFile(root+'collection.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({models:scope.length,empty:checks.filter(x=>x.endpointCount===0),errors:checks.filter(x=>x.http!==200)}));
