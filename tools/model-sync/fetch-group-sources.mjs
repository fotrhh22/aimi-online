import { readFile, writeFile } from 'node:fs/promises';
const raw=JSON.parse(await readFile('data/model-sources/openrouter-current.json','utf8')).data;
const models=JSON.parse(await readFile('content/fixtures/models.json','utf8')).models;
const jobs=[];
for(const model of models){
 const r=raw.find(x=>x.id===model.id);
 if(model.id.startsWith('openai/')) jobs.push({id:model.id,kind:'provider-document',url:'https://developers.openai.com/api/docs/models/'+model.id.split('/')[1].replace(/:batch$/,'')+'.md'});
 else if(r?.hugging_face_id) jobs.push({id:model.id,kind:'publisher-model-card',url:'https://huggingface.co/'+r.hugging_face_id+'/raw/main/README.md'});
}
let cursor=0,results=[];
await Promise.all(Array.from({length:6},async()=>{while(cursor<jobs.length){const i=cursor++,j=jobs[i];try{const r=await fetch(j.url,{signal:AbortSignal.timeout(12000)});const body=await r.text();const file=j.id.replace(/[^a-z0-9.-]/gi,'_')+'.txt';if(r.ok)await writeFile('data/model-sources/group-sources/'+file,body);results.push({...j,status:r.status,contentType:r.headers.get('content-type'),file:r.ok?file:null,characters:body.length});}catch(e){results.push({...j,status:'fetch-failed',error:e.name});}if(results.length%20===0)console.log('Read '+results.length+'/'+jobs.length+' primary model documents.');}}));
results.sort((a,b)=>a.id.localeCompare(b.id));await writeFile('data/model-sources/group-sources/index.json',JSON.stringify({checkedAt:'2026-11-10',sources:results},null,2)+'\n');console.log(JSON.stringify({total:jobs.length,ok:results.filter(x=>x.status===200).length,failed:results.filter(x=>x.status!==200).map(x=>({id:x.id,status:x.status}))}));
