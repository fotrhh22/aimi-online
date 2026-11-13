import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {publishAvailableModels,availabilityAllowsRecommendation} from '../../packages/contracts/dist/index.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const policy=await read('content/catalog/model-availability.json');
const source=[...(await read('content/fixtures/models.json')).models,...(await read('content/fixtures/models-media.json')).models];
const now=new Date(), published=publishAvailableModels(source,policy,now), ids=new Set(published.map(m=>m.id));
const kinds=['text','image','video','audio'];
const labels={text:'텍스트',image:'이미지',video:'영상',audio:'음악·오디오'};
const summary={checkedAt:now.toISOString(),dateZone:'Asia/Seoul',version:policy.version,source:source.length,published:published.length,counts:Object.fromEntries(kinds.map(kind=>[kind,{source:source.filter(m=>(m.media?.kind??'text')===kind).length,listed:published.filter(m=>(m.media?.kind??'text')===kind).length,statusEligible:published.filter(m=>(m.media?.kind??'text')===kind&&availabilityAllowsRecommendation(m.availability,now)).length}]))};
const lines=[
 '# 모델 수명주기·작업 유형 전수 감사',
 '',`보고 기준: ${now.toLocaleString('sv-SE',{timeZone:'Asia/Seoul'})} Asia/Seoul. 정책 ${policy.version}.`,
 '', '공개 메타데이터254개 전부 조회 성공. 완성·이미지·영상 생성 요청0회. 실제 계정의 호출 성공이나 품질을 검증한 기록은 아니다.',
 '', '## 현재 적용 결과','', '| 분야 | 원본 후보 | 현재 기본 목록 | 상태 조건 통과* |','|---|---:|---:|---:|',
 ...kinds.map(k=>`| ${labels[k]} | ${summary.counts[k].source} | ${summary.counts[k].listed} | ${summary.counts[k].statusEligible} |`),
 '', '* 상태 통과는 추천 확정 개수가 아니다. 분야별 지원·품질·비용 조건을 추가 검사해 최대3개만 추천한다.',
 '', '최신 사용자 결정으로 텍스트·이미지·영상만 제공한다. 음악·음성·대화형 오디오·전사·임베딩·검색 재정렬·구조화 판단은 목록과 추천에서 제외한다. 사용자 요청이 이 분야라면 UNSUPPORTED_OUTPUT으로 안내하며 텍스트 모델로 대신 추천하지 않는다.',
 '', '## 주요 결정',
 '', '- 이미지45개는 고정된 1차 검토 후보다. 참조 필수5개·SVG6개(겹침2개), 공식 종료1개·제공자 없음1개·제품 연결 보류5개를 중복 없이 합쳐16개 제외했다. 실제 생성 성공 검수45개라는 뜻이 아니다.',
 '- 공식 API 종료와 별도 제공자의 호스팅은 구분한다. GPT Image1 등 공식 종료는 기본 목록에서 보류하며, 공개 가중치가 있는 Mistral Small3.0의 다른 제공자가 존재한다는 기록도 보존한다.',
 '- 영상 편집2개(FLUX Video Edit/Runway Aleph2), 업스케일1개, 사진 기반 아바타1개는 용도가 다르므로 제외한다. 종료됐다는 뜻은 아니다.',
 '- Seedance2.0/2.0Fast, Gemini Omni1.2Flash, Lyria3ProPreview는 수집 응답의 모든 경로가 비활성 상태다. 영구 종료와 혼동하지 않고 제공 상태 보류로 기록한다.',
 '- GPT Audio/Audio Mini는 대화형 오디오이며 음악 생성과 구분했다. 최신 사용자 결정에 따라 음악을 포함한 모든 오디오 자체를 제외한다.',
 '- 폐기 예정·가입 제한·Deprecated는 안내와 함께 탐색할 수 있지만 신규 추천에서 제외한다. 날짜만 있는 폐기 안내는 한국 날짜 시작부터 보수적으로 보류한다. 이 시각을 제공자의 실제 전세계 종료 시각으로 단정하지 않는다.',
 '- Seedance1.5Pro는 수집 당시 한국11/10에는 예정이었고 한국11/11부터 보류한다. 이로 인해 영상26개가 현재25개로 줄었다.',
 '- DeepSeek 공식 deepseek-chat 별칭 종료를 별도 호스팅된 V3 전체 종료로 확대 해석하지 않는다. API ID와 제공자 경로를 개별 확인했다.',
 '', '## 검증 범위·출처',
 '', 'OpenAI·Google·Anthropic·Mistral·Kimi 공식 상태 표와 DeepSeek·Runway·xAI·Cohere 관련 공식 문서를 대조했다. 그 외에는 기존 모델별 공급사 제품 근거를 재사용하고 공개 제공자 경로를 확인했다. 전 공급사의 모든 종료 공지를 빠짐없이 조사했다거나 목록에 남은 전 모델의 실제 호출을 완료했다고 표현하지 않는다.',
 '', '공식 출처의 검토 시점은 content/policies/lifecycle-sources-v1.json에 별도 고정한다. 엔드포인트 재수집만으로 공식 공지 검토 시점을 새로 바꾸지 않는다. 7일 지난 감사·미감사 신규 ID·미래 검토 시점·제공자0개는 신규 추천에서 보류한다.',
 '', '## 파일·실행',
 '', '- content/catalog/model-availability.json:254행의 개별 상태·근거·제공자·정책.',
 '- content/catalog/image-candidates-45.json:고정 이미지 후보 ID45개.',
 '- content/policies/lifecycle-sources-v1.json:공식 검토 출처와 시점.',
 '- data/model-sources/lifecycle/2026-11-10/:공개 전체 원본·개별 엔드포인트254개·수집 결과. 수집은 한국11/10, 최종 보고·반영은11/11.',
 '- npm run models:audit:collect:공개 상태 재수집. 공급사 공지 검토를 자동으로 완료하지 않는다.',
 '- npm run models:audit:build:검토된 공지+공개 상태로 정책 재생성.',
 '- npm run models:audit:report:현재 날짜 기준 적용 결과·전체 결정표 갱신.',
 '', '## 전체254개 결정표','', '| 분야 | 모델 | 상태 | 현재 노출 | 상태상 신규 추천 | 안내일 | 이슈·근거 |','|---|---|---|---|---|---|---|',
 ...policy.models.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)).map(r=>{
  const shown=ids.has(r.id);const extra=r.sources.find(s=>s.date||s.reason);
  const link=`[제공자 검사](${r.sources[0].url})`+(extra?` · [검토 근거](${extra.url})`:'');
  return `| ${r.kind} | ${r.id} | ${r.status} | ${shown?'표시':'제외'} | ${shown&&availabilityAllowsRecommendation(r,now)?'허용':'보류'} | ${r.shutdownDate??'—'} | ${r.issues.join(', ')||'공개 경로 확인'} · ${link} |`;
 }),
];
await mkdir('output/model-audit/lifecycle/2026-11-10',{recursive:true});
await mkdir('docs/current',{recursive:true});
await writeFile('docs/current/MODEL_LIFECYCLE_AUDIT.md',lines.join('\n')+'\n');
await writeFile('output/model-audit/lifecycle/2026-11-10/published-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
