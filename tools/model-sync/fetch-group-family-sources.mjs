import { readFile, writeFile } from 'node:fs/promises';
const jobs=[
 ['claude-overview','https://platform.claude.com/docs/en/models/overview.md'],
 ['claude-lifecycle','https://docs.anthropic.com/en/docs/about-claude/model-deprecations.md'],
 ['gemini-overview','https://ai.google.dev/gemini-api/docs/models?hl=en'],
 ['gemini-flash-lite','https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite?hl=en'],
 ['gemma-4','https://ai.google.dev/gemma/docs/core/model_card_4?hl=en'],
 ['mistral-overview','https://docs.mistral.ai/models'],
 ['mistral-large','https://docs.mistral.ai/models/mistral-large'],
 ['mistral-medium','https://docs.mistral.ai/models/mistral-medium-3-5'],
 ['solar-mini','https://console.upstage.ai/ko/docs/models/solar-mini-4'],
 ['solar-pro','https://console.upstage.ai/ko/docs/models/solar-pro-4'],
 ['cohere-overview','https://docs.cohere.com/docs/models.md'],
 ['cohere-north','https://docs.cohere.com/changelog/north-mini-code-1-0.md'],
 ['qwen-overview','https://www.alibabacloud.com/help/en/model-studio/text-generation-model/'],
 ['zai-air','https://docs.z.ai/guides/llm/glm-4.5.md'],
 ['meta-muse','https://ai.meta.com/tools/muse/'],
 ['meta-llama','https://www.llama.com/models/llama-4/'],
 ['nvidia-super-vl','https://build.nvidia.com/nvidia/nemotron-3.5-super-vl/modelcard'],
 ['gpt4o-base','https://developers.openai.com/api/docs/models/gpt-4o.md'],
];
for(const id of ['grok-4.7','grok-4.6','grok-4.5','grok-4.3','grok-4.20'])jobs.push([id,'https://docs.x.ai/developers/models/'+id]);
const results=[];let cursor=0;
await Promise.all(Array.from({length:5},async()=>{while(cursor<jobs.length){const [key,url]=jobs[cursor++];try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});const body=await r.text();const file=key+'.txt';if(r.ok)await writeFile('data/model-sources/group-sources/'+file,body);results.push({key,url,status:r.status,contentType:r.headers.get('content-type'),file:r.ok?file:null,characters:body.length});}catch(e){results.push({key,url,status:'fetch-failed',error:e.name});}}}));
await writeFile('data/model-sources/group-sources/families.json',JSON.stringify({checkedAt:'2026-11-10',sources:results},null,2)+'\n');console.log(JSON.stringify(results.map(({key,status})=>({key,status}))));
