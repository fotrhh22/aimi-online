"""Build auditable lifecycle decisions from public metadata and reviewed official notices.
No generation calls. Source snapshots remain intact; runtime filters the catalogue.
"""
import json,re,datetime,pathlib,collections
root=pathlib.Path('data/model-sources/lifecycle/2026-11-10')
read=lambda p:json.loads(pathlib.Path(p).read_text())
raw=read(root/'models-all.json');byraw={m['id']:m for m in raw['data']}
collection=read(root/'collection.json');checks={x['id']:x for x in collection['checks']}
original=read('content/fixtures/models.json')['models']+read('content/fixtures/models-media.json')['models']
now=collection['checkedAt'];today=now[:10]
notice_review=read('content/policies/lifecycle-sources-v1.json')['reviewedAt']
oai='https://developers.openai.com/api/docs/deprecations'
google='https://ai.google.dev/gemini-api/docs/deprecations'
claude='https://platform.claude.com/docs/en/about-claude/model-deprecations'
parsed={}
for line in pathlib.Path('data/model-sources/openai-deprecations-2026-11-10.md').read_text().splitlines():
 if not line.startswith('|'):continue
 cells=re.split(r'(?<!\\)\|',line)[1:-1]
 if len(cells)<2:continue
 date=cells[0].strip().replace('‑','-')
 dt=None
 for fmt in ['%Y-%m-%d','%B %d, %Y','%b %d, %Y']:
  try:dt=datetime.datetime.strptime(date,fmt).date().isoformat();break
  except ValueError:pass
 if not dt:continue
 for name in re.findall(r'`([^`]+)`',cells[1]):parsed[name]=dt
# Known official identity/lifecycle distinctions, not an inference that all hosted open weights have retired.
reviewed={
 'mistralai/mistral-small-24b-instruct-2501':dict(status='retired',date='2025-11-30',source='https://docs.mistral.ai/models/mistral-small-3-0-25-01',reason='Mistral 공식 Serverless API에서 Retired로 표시해요. DeepInfra의 별도 호스팅은 존재하지만 기본 추천 목록에서는 보수적으로 제외해요.'),
 'mistralai/mistral-medium-3-5':dict(status='deprecated',source='https://docs.mistral.ai/models/mistral-medium-3-5-26-04',reason='공식 제품 문서에서 Deprecated로 분류해요. 10/31은 deprecation date이며 종료일로 바꾸어 해석하지 않아요.'),
 'mistralai/mistral-medium-3':dict(status='deprecated',source='https://docs.mistral.ai/models/mistral-medium-3-25-05',reason='공식 제품 문서에서 Deprecated로 분류해요. 5/22은 deprecation date이며 종료일로 바꾸어 해석하지 않아요.'),
 'google/gemini-3.1-flash-lite-preview':dict(status='retired',date='2026-05-25',source=google,reason='공식 Google 문서에서 이미 종료된 Preview 버전이며 정식 Flash Lite와 다른 모델이에요.'),
 'google/gemini-2.5-pro':dict(status='scheduled',date='2026-12-01',source=google,reason='공식 API는 기존 사용자로 제한되며 12/1부터 다른 모델로 자동 대체돼요.'),
 'google/gemini-2.5-flash':dict(status='scheduled',date='2026-12-01',source=google,reason='공식 API는 기존 사용자로 제한되며 12/1부터 다른 모델로 자동 대체돼요.'),
 'google/gemini-3.5-flash':dict(status='redirected',source=google,reason='공식 문서에서 Gemini 3.6 Flash로 자동 라우팅한다고 안내해 기존 버전의 동일성을 확인할 수 없어요.'),
 'moonshotai/kimi-k2.5':dict(status='deprecated',source='https://platform.kimi.ai/docs/models',reason='제작사 공식 목록에서 Deprecated로 분류했어요. 별도 호스팅 경로 존재와 구분해 신규 추천에서 제외해요.'),
 'moonshotai/kimi-k2-thinking':dict(status='deprecated',source='https://platform.kimi.ai/docs/models',reason='제작사 공식 API 목록의 Deprecated 항목이에요. 공개 가중치 자체의 소멸을 뜻하지 않아요.'),
 'moonshotai/kimi-k2.7-code':dict(status='restricted',source='https://platform.kimi.ai/docs/models',reason='공식 API는 11/1 이전 가입자로 제한되며 12월 말 폐기 예정이라고 안내해요. 정확한 일자는 미정이에요.'),
 'moonshotai/kimi-k2.6':dict(status='restricted',source='https://platform.kimi.ai/docs/models',reason='공식 API는 11/1 이전 가입자로 제한되며 12월 말 폐기 예정이라고 안내해요. 정확한 일자는 미정이에요.'),
}
image_pool=read('content/catalog/image-candidates-45.json')['ids']
assert len(image_pool)==45 and len(set(image_pool))==45
# User-approved 45-image first-review pool: 16 excluded IDs, including two overlapping reference/vector cases.
image_exclusions={
 'openai/gpt-image-1':'official_retired', 'meta/muse-image':'no_endpoint',
 'qwen/qwen-image-3':'product_mapping_unconfirmed','qwen/qwen-image-3-pro':'product_mapping_unconfirmed',
 'openai/gpt-5-image':'combined_product_unconfirmed','openai/gpt-5-image-mini':'combined_product_unconfirmed','openai/gpt-5.4-image-2':'combined_product_unconfirmed',
 'krea/k3-edit':'reference_required','recraft/recraft-v4-styles':'reference_required','recraft/recraft-v4-styles-pro':'reference_required',
 'recraft/recraft-v4-styles-vector':'reference_and_svg','recraft/recraft-v4-styles-pro-vector':'reference_and_svg',
 'recraft/recraft-v4-vector':'svg_only','recraft/recraft-v4-pro-vector':'svg_only','recraft/recraft-v4.1-vector':'svg_only','recraft/recraft-v4.1-pro-vector':'svg_only',
}
video_special={
 'black-forest-labs/flux-video-edit':'참조 영상 편집 전용',
 'black-forest-labs/flux-video-upscale':'참조 영상 업스케일 전용',
 'runway/aleph-2':'참조 영상 편집 전용',
 'heygen/avatar-iv':'사진과 음성을 사용하는 아바타 애니메이션 전용',
}
groups=read('content/policies/model-groups-v3.json')['models'];grouprefs={m['id']:m.get('sources',[]) for m in groups}
rows=[]
for m in original:
 id=m['id'];kind=m.get('media',{}).get('kind','text');r=byraw.get(id);check=checks.get(id)
 if not check:continue
 issues=[];sources=[{'url':check['url'],'checkedAt':check['checkedAt'],'scope':'public-endpoint-metadata'}]
 ep=read(root/('endpoints/'+id.replace('/','__')+'.json'))
 body=ep['body'].get('data',ep['body']) if ep.get('body') else {};endpoints=body.get('endpoints',[])
 status='available';visible=True;eligible=True;date=None
 if r is None:issues.append('not_listed');visible=eligible=False;status='unconfirmed'
 if check['http']!=200:issues.append('endpoint_check_failed');visible=eligible=False;status='unconfirmed'
 elif not endpoints:issues.append('no_endpoint');visible=eligible=False;status='unavailable'
 elif kind!='image' and not any(e.get('status')==0 for e in endpoints):issues.append('no_active_provider_path');visible=eligible=False;status='unavailable'
 expiry=r.get('expiration_date') if r else None
 if expiry:
  date=expiry;eligible=False;status='scheduled' if expiry>today else 'expired';issues.append('openrouter_expiration')
  if expiry<=today:visible=False
  sources.append({'url':'https://openrouter.ai/docs/guides/overview/models','scope':'OpenRouter expiry may not be a guaranteed global shutdown date'})
 official=None
 if id.startswith('openai/'):
  slug=id.split('/',1)[1];slug=re.sub(r':(?:batch|free)$','',slug)
  canonical=(m.get('canonicalId')or'').split('/')[-1]
  matches=[parsed[n] for n in [slug,canonical] if n in parsed]
  if matches:
   official=min(matches);date=min([d for d in [date,official] if d]);eligible=False;status='retired' if official<=today else 'scheduled';issues.append('official_shutdown_notice')
   if official<=today:visible=False
   sources.append({'url':oai,'date':official,'scope':'OpenAI API official retirement; hosted alternatives not assumed valid'})
 if id in reviewed:
  d=reviewed[id];status=d['status'];eligible=False;issues.append('official_'+status)
  if d.get('date'):date=min([x for x in [date,d['date']] if x])
  if status in ['retired','redirected']:visible=False
  sources.append({'url':d['source'],'reason':d['reason'],'date':d.get('date')})
 if kind=='image' and id not in image_pool:
  issues.append(image_exclusions.get(id,'outside_approved_45_pool'));visible=eligible=False
  if status=='available':status='held'
 if kind=='video' and id in video_special:
  issues.append('specialized_video_workflow');visible=eligible=False;status='specialized'
  sources.append({'url':'https://openrouter.ai/'+id,'reason':video_special[id]})
 if kind=='audio' and id.startswith('openai/'):
  issues.append('conversational_audio_not_music');visible=eligible=False
  sources.append({'url':'https://openrouter.ai/'+id,'reason':'대화형 음성 입출력 모델. 음악 생성과 혼동하지 않도록 현재 음악 후보에서 분리 보류.'})
 # API presence is not proof of a generation working, and is not a universal official support guarantee.
 refs=[s for s in grouprefs.get(id,[]) if s.get('kind')=='provider-model-document']
 sources.extend({'url':s['url'],'checkedAt':s.get('readAt'),'scope':'product identity reference; not universal lifecycle clearance'} for s in refs[:1])
 if id in ['deepseek/deepseek-chat','deepseek/deepseek-chat-v3.1','deepseek/deepseek-chat-v3-0324','deepseek/deepseek-v3.1-terminus']:
  sources.append({'url':'https://api-docs.deepseek.com/updates/','scope':'Official deepseek-chat/reasoner aliases ended 2026-07-24; OpenRouter IDs represent independently hosted published versions, active provider paths checked; not a claim official alias still exists.'})
 if kind=='audio':
  issues.append('excluded_output_scope');visible=eligible=False
  if status=='available':status='out-of-scope'
 row={'id':id,'name':m['name'],'kind':kind,'status':status,'visible':visible,'recommendationAllowed':eligible and visible,'checkedAt':min(check['checkedAt'],notice_review),'shutdownDate':date,'openrouterExpirationDate':expiry,'endpointCount':len(endpoints),'activeEndpointCount':sum(e.get('status')==0 or kind=='image' and 'status' not in e for e in endpoints),'providerStatuses':[{'provider':e.get('provider_name'),'status':e.get('status')}for e in endpoints],'issues':list(dict.fromkeys(issues)),'sources':sources,'generationTested':False,'evidenceScope':'official-notice crosscheck where available + public metadata; not per-account or quality validation'}
 rows.append(row)
policy={'version':'model-availability-v1','checkedAt':min(now,notice_review),'officialNoticesReviewedAt':notice_review,'asOfDate':today,'scope':['text','image','video','audio'],'publishedOutputKinds':['text','image','video'],'imageCandidateCount':45,'policy':'Retired/identity-redirected/no-provider/held/specialized routes hidden. Announced deprecations visible with notice but excluded from new recommendations. Missing/older than 7 days audit cannot recommend. Source records preserved.','models':rows}
path=pathlib.Path('content/catalog/model-availability.json');path.write_text(json.dumps(policy,ensure_ascii=False,indent=2)+'\n')
print('total audited',len(rows))
for kind in ['text','image','video','audio']:
 rs=[r for r in rows if r['kind']==kind];print(kind,'source',len(rs),'visible',sum(r['visible']for r in rs),'allowed',sum(r['recommendationAllowed']for r in rs),'status',dict(collections.Counter(r['status']for r in rs)))
for row in rows:
 if not row['visible']:print('HIDDEN',row['id'],row['status'],','.join(row['issues']))
