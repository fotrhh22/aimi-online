/** Read-only catalogue simulation. Does not publish mappings or runtime content. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../../',import.meta.url);
await mkdir(new URL('output/model-audit/',root),{recursive:true});
const read = async p => JSON.parse(await readFile(new URL(p,root),'utf8'));
const aa=await read('content/fixtures/aa-public.json');
const or=await read('data/model-sources/openrouter-current.json');
const reviewed=await read('content/model-mappings.json');
const aliases={google:'Google',openai:'OpenAI',anthropic:'Anthropic',xiaomi:'Xiaomi',nvidia:'NVIDIA',cohere:'Cohere',mistralai:'Mistral',minimax:'MiniMax',stepfun:'StepFun','ibm-granite':'IBM',thinkingmachines:'Thinking Machines',liquid:'Liquid AI',qwen:'Alibaba',amazon:'Amazon','x-ai':'SpaceXAI','meta-llama':'Meta',meta:'Meta',moonshotai:'Kimi','z-ai':'Z AI',deepseek:'DeepSeek',perplexity:'Perplexity',upstage:'Upstage',microsoft:'Microsoft',nousresearch:'Nous Research',inclusionai:'InclusionAI','bytedance-seed':'ByteDance Seed',tencent:'Tencent',reflection:'Reflection','nex-agi':'Nex AGI',rekaai:'Reka AI',arcee:'Arcee AI'};
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cleanName=s=>s.replace(/^[^:]+: /,'').replace(/\((free|batch|extended|nitro|exacto)\)/gi,'').trim();
const cleanId=s=>s.replace(/:(free|batch|extended|nitro|exacto)$/,'').replace(/-batch$/,'');
const familyName=s=>s.replace(/\((?:non[- ]?reasoning|reasoning|low|medium|high|minimal|max|xhigh|extra high|adaptive|default fallback|api default|thinking|no thinking)(?:[^)]*)\)/gi,'').trim();
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const valid=or.data.filter(m=>m.architecture?.output_modalities?.includes('text')&&number(m.pricing?.prompt)&&number(m.pricing?.completion));
const buckets=new Map();
for(const m of valid){const key=cleanId(m.canonical_slug||m.id);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(m);}
const fields={
 intelligence:'evaluations.artificial_analysis_intelligence_index',finance:'evaluations.artificial_analysis_finance_and_accounting_index',strategy:'evaluations.artificial_analysis_strategy_and_ops_index',legal:'evaluations.artificial_analysis_legal_index',medical:'evaluations.artificial_analysis_healthcare_and_medical_index',engineering:'evaluations.artificial_analysis_engineering_index',economics:'evaluations.artificial_analysis_economics_index',speed:'performance.median_output_tokens_per_second',firstToken:'performance.median_time_to_first_token_seconds',firstAnswer:'performance.median_time_to_first_answer_token_seconds',endToEnd:'performance.median_end_to_end_response_time_seconds',aaInput:'pricing.price_1m_input_tokens',aaOutput:'pricing.price_1m_output_tokens',aaCache:'pricing.price_1m_cache_hit_tokens'};
const value=(m,k)=>fields[k].split('.').reduce((v,p)=>v?.[p],m);
const rows=[];
for(const [canonical,variants] of buckets){
 variants.sort((a,b)=>Number(/:/.test(a.id))-Number(/:/.test(b.id))||Number(Number(a.pricing.prompt)===0)-Number(Number(b.pricing.prompt)===0)||a.id.localeCompare(b.id));
 const m=variants[0], creator=aliases[m.id.split('/')[0]];
 const identity=variants.flatMap(v=>[norm(cleanId(v.id).split('/').slice(1).join('/')),norm(cleanName(v.name))]);
 const exact=aa.data.filter(a=>a.model_creator?.name===creator&&[norm(a.slug),norm(a.name)].some(k=>identity.includes(k)));
 const family=aa.data.filter(a=>a.model_creator?.name===creator&&[norm(familyName(a.name)),norm(a.slug)].some(k=>identity.includes(k)));
 const verified=reviewed.filter(x=>x.reviewed&&variants.some(v=>v.id===x.openrouterId)).map(x=>aa.data.find(a=>a.id===x.aaId)).filter(Boolean);
 const candidates=[...new Map([...verified,...exact,...family].map(a=>[a.id,a])).values()];
 rows.push({canonical,id:m.id,name:cleanName(m.name),variants:variants.map(v=>v.id),creator:creator??null,matchStatus:verified.length?'existing-reviewed':exact.length===1&&!/\([^)]*\)/.test(exact[0].name)?'exact-name-candidate':exact.length?'exact-name-settings-review':family.length?'family-settings-review':'unmatched',aaIds:candidates.map(a=>a.id),aaNames:candidates.map(a=>a.name),fields:Object.fromEntries(Object.keys(fields).map(k=>[k,{anyCandidate:candidates.some(a=>finite(value(a,k))),allCandidates:candidates.length>0&&candidates.every(a=>finite(value(a,k))),candidateValues:candidates.filter(a=>finite(value(a,k))).map(a=>({id:a.id,value:value(a,k)}))}])),orFields:{context_length:finite(m.context_length),max_completion_tokens:finite(m.top_provider?.max_completion_tokens),input_modalities:Array.isArray(m.architecture?.input_modalities),output_modalities:Array.isArray(m.architecture?.output_modalities),supported_parameters:Array.isArray(m.supported_parameters),input_cache_read:number(m.pricing?.input_cache_read),description:!!m.description,created:finite(m.created),canonical_slug:!!m.canonical_slug},representative:m});
}
const any=(r,keys)=>keys.every(k=>r.fields[k].anyCandidate);
// Values above remain settings-specific candidates; never merge scores across AA settings.
const allOnOne=(r,keys)=>aa.data.some(a=>r.aaIds.includes(a.id)&&keys.every(k=>finite(value(a,k))));
const six=['speed','firstToken','firstAnswer','endToEnd','aaInput','aaOutput'];
const scenarios={orPrice:rows.length,orPriceAndContext:rows.filter(r=>r.orFields.context_length).length,orPriceContextMaxOutput:rows.filter(r=>r.orFields.context_length&&r.orFields.max_completion_tokens).length,orPriceContextMaxOutputModalitiesParams:rows.filter(r=>['context_length','max_completion_tokens','input_modalities','output_modalities','supported_parameters'].every(k=>r.orFields[k])).length,orCache:rows.filter(r=>r.orFields.input_cache_read).length,anyAaIdentityCandidate:rows.filter(r=>r.aaIds.length).length,aaSpeedWithOrPrice:rows.filter(r=>any(r,['speed'])).length,aaFourTimingsWithOrPrice:rows.filter(r=>allOnOne(r,six.slice(0,4))).length,aaSix:rows.filter(r=>allOnOne(r,six)).length,aaSeven:rows.filter(r=>allOnOne(r,[...six,'aaCache'])).length,aaIntelligence:rows.filter(r=>any(r,['intelligence'])).length,aaAnyEvaluation:rows.filter(r=>['intelligence','finance','strategy','legal','medical','engineering','economics'].some(k=>r.fields[k].anyCandidate)).length,aaIntelligenceAndSix:rows.filter(r=>allOnOne(r,['intelligence',...six])).length,aaAllFourteen:rows.filter(r=>allOnOne(r,Object.keys(fields))).length};
const summary={aaSnapshot:'2026-11-08 (existing stored response)',orFetchedAt:or.fetchedAt,aaRows:aa.data.length,orRows:or.data.length,textPricedRows:valid.length,canonicalProducts:rows.length,removedVariantRows:valid.length-rows.length,status:Object.fromEntries([...new Set(rows.map(r=>r.matchStatus))].map(k=>[k,rows.filter(r=>r.matchStatus===k).length])),scenarios,fieldCoverage:Object.fromEntries(Object.keys(fields).map(k=>[k,rows.filter(r=>r.fields[k].anyCandidate).length])),orFieldCoverage:Object.fromEntries(Object.keys(rows[0].orFields).map(k=>[k,rows.filter(r=>r.orFields[k]).length])),caveat:'All new name matches are candidates, not reviewed mappings. Coverage is an optimistic upper bound pending exact version/reasoning/endpoint review. No cross-setting null filling.'};
// Remove orchestration/automatic routing products rather than counting them as models.
const excluded = new Set(['nvidia/switchyard','typesafe/jev-router']);
const eligible = rows.filter(r => !r.id.startsWith('openrouter/') && !excluded.has(r.id)
  && r.orFields.context_length && r.orFields.max_completion_tokens);
const coverageScore = r => (r.matchStatus==='existing-reviewed'?10000:0)
  + (r.fields.speed.anyCandidate?1000:0)
  + (r.fields.intelligence.anyCandidate?100:0)
  + Object.values(r.fields).filter(f=>f.anyCandidate).length*10
  + (r.orFields.input_cache_read?5:0) + (r.aaIds.length?1:0);
eligible.sort((a,b)=>coverageScore(b)-coverageScore(a)
  || b.representative.created-a.representative.created || a.id.localeCompare(b.id));
const selected=eligible.slice(0,300);
const coverage = group => ({models:group.length,
  aaIdentityCandidates:group.filter(r=>r.aaIds.length).length,
  aaPerformanceCandidates:group.filter(r=>allOnOne(r,six.slice(0,4))).length,
  aaIntelligenceCandidates:group.filter(r=>any(r,['intelligence'])).length,
  aaAnyEvaluationCandidates:group.filter(r=>['intelligence','finance','strategy','legal','medical','engineering','economics'].some(k=>r.fields[k].anyCandidate)).length,
  orCache:group.filter(r=>r.orFields.input_cache_read).length,
  existingReviewed:group.filter(r=>r.matchStatus==='existing-reviewed').length});
summary.cleanCatalogue=coverage(eligible);
summary.selection300=coverage(selected);
summary.selectionWithRequiredOrCache=coverage(eligible.filter(r=>r.orFields.input_cache_read));
await writeFile(new URL('output/model-audit/selected-300.json',root),JSON.stringify({purpose:'Simulation only, NOT published/reviewed runtime model mappings',aaSnapshot:summary.aaSnapshot,orFetchedAt:or.fetchedAt,selection:summary.selection300,models:selected.map(r=>({canonical:r.canonical,id:r.id,name:r.name,matchStatus:r.matchStatus,aaCandidateIds:r.aaIds,aaCandidateNames:r.aaNames,orFields:r.orFields}))},null,2)+'\n');
await mkdir(new URL('output/model-audit/',root),{recursive:true});
await writeFile(new URL('output/model-audit/coverage.json',root),JSON.stringify({summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
