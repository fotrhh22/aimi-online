"""Build an immutable reviewed revision from inspected existing images; no API calls."""
import copy, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
EDITORIAL = json.loads((Path(__file__).with_name('editorial.json')).read_text())
OUT = ROOT / 'content/challenges/reviewed-10d-v3'
SOURCES = {
 'google-family': {'title':'Google DeepMind Gemini Image prompt guide', 'url':'https://deepmind.google/models/gemini-image/prompt-guide/', 'scope':'family', 'legacy_tip_id':'T05'},
 'flux3': {'title':'BFL FLUX 3 Image Prompting Basics', 'url':'https://docs.bfl.ml/guides/prompting_unified_basics', 'scope':'exact_model', 'legacy_tip_id':'T01'},
 'flux2': {'title':'BFL FLUX.2 Pro & Max Prompting Guide', 'url':'https://docs.bfl.ai/guides/prompting_guide_flux2', 'scope':'explicit_variants', 'legacy_tip_id':'T03'},
 'openai26': {'title':'OpenAI GPT Image 2.6 prompting', 'url':'https://developers.openai.com/api/docs/guides/image-prompting', 'scope':'explicit_version', 'legacy_tip_id':'T09'},
 'openai25': {'title':'OpenAI GPT Image 2.5 prompting', 'url':'https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5', 'scope':'explicit_version', 'legacy_tip_id':'T09'},
 'krea-family': {'title':'Krea 2 prompting guidelines (Turbo examples)', 'url':'https://github.com/krea-ai/krea-2/blob/main/docs/prompting.md', 'scope':'family_with_turbo_examples', 'legacy_tip_id':'T06'},
 'recraft4': {'title':'Recraft V4 prompt engineering guide', 'url':'https://www.recraft.ai/blog/prompt-engineering-guide', 'scope':'explicit_version', 'legacy_tip_id':'T10'},
 'grok-image': {'title':'Grok Image Prompting Guide', 'url':'https://docs.x.ai/developers/model-capabilities/images/prompting-guide', 'scope':'image_family', 'legacy_tip_id':'T14'},
 'seedream-observation': {'title':'Seedream 5.0 Pro product introduction + this generation observation', 'url':'https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro', 'scope':'generation_observation_not_model_specific_rule', 'legacy_tip_id':None},
}
for source in SOURCES.values():
 source.update(checked_at='2026-11-11', reviewer='Codex AI', quoted_verbatim=False)
def write(path, value):
 path.parent.mkdir(parents=True, exist_ok=True)
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def particle(text, vowel, consonant):
 c=ord(text[-1]); return text+(consonant if 0xac00<=c<=0xd7a3 and (c-0xac00)%28 else vowel)
def public_label(context, value):
 # Do not turn opaque IDs into the same visible label for different objects.
 if '색' in context and context not in ['배경','하늘 색']: return context+': '+value
 if context.endswith('수'): return context.removesuffix('개수').removesuffix('수').strip()+' '+value if not value.startswith('주요 산장') else value
 if context in ['로봇 기준 화분 위치','자전거 기준 곰 위치','꽃병 기준 책 위치']:
  return {'로봇 기준 화분 위치':'화분 위치','자전거 기준 곰 위치':'자전거 기준 곰','꽃병 기준 책 위치':'꽃병 기준 책'}[context]+': '+value
 if value in ['안에','밖에','위에','아래에','들고 있다','두르고 있다','쓰고 있다','밟고 있다','손에 들고 있다','발로 밟고 있다']:
  return context+': '+value
 return value
CLAUSE_SUBJECTS = {'동물':'동물','과일의 종류':'과일','주요 대상':'주요 대상','식물':'식물','건물':'건물','꽃 종류':'꽃','하늘의 이동수단':'하늘의 이동수단'}
def clause(c, value):
 ctx=c['context']; var=c['variable']
 if ctx.endswith('수') or ctx.endswith('개수'):
  subject=ctx.removesuffix('개수').removesuffix('수').strip()
  return (particle(value,'를','을')+' 주요 대상으로 그려줘.') if value.startswith('주요 산장') else particle(subject,'는','은')+' '+value+'만 보여줘.'
 if '색' in ctx and ctx not in ['배경','하늘 색']:
  subject=ctx.removesuffix(' 색')
  return particle(subject,'는','은')+' '+value+'으로 표현해줘.'
 if ctx=='토끼와 목도리':return '토끼가 목도리를 '+value.removesuffix('있다')+'있게 해줘.' if value.endswith('있다') else '토끼와 목도리는 '+value+'로 표현해줘.'
 if ctx=='곰과 우산':return '곰이 우산을 '+value.removesuffix('있다')+'있게 해줘.' if value.endswith('있다') else '곰과 우산은 '+value+'로 표현해줘.'
 if ctx=='로봇과 도구':return '로봇이 물뿌리개를 '+value.removesuffix('있다')+'있게 해줘.' if value.endswith('있다') else '로봇과 도구는 '+value+'로 표현해줘.'
 if ctx=='선인장 위치':return '선인장을 화분 '+value+' 놓아줘.'
 if ctx in ['오리 인형과 공','오리 모양과 받침']:return '오리 모양을 원형 받침 '+value+' 놓아줘.'
 if ctx=='자전거 기준 곰 위치':return '곰을 자전거 '+value.removesuffix('에')+'에 놓아줘.'
 if ctx=='꽃병 기준 책 위치':return '책을 꽃병 '+value.removesuffix('에')+'에 놓아줘.'
 if ctx=='로봇 기준 화분 위치':return '화분을 '+(value if value.startswith('로봇') else '로봇의 화면 '+value)+'에 놓아줘.'
 if ctx.endswith('배치'):return particle(ctx[:-2].strip(),'를','을')+' '+value+' 배치해줘.'
 if ctx.endswith('화면 위치'):return particle(ctx.replace('의 화면 위치','').replace('들의 화면 위치','들'),'를','을')+' '+value+'에 배치해줘.'
 if ctx=='나무의 위치':return '나무를 '+value+'에 배치해줘.'
 if ctx=='표현 방식':return value+' 스타일로 표현해줘.'
 if ctx in ['시점','오리 인형의 보이는 면','오리 모양의 보이는 면']:return value+'이 보이는 구도로 그려줘.'
 if '보이는 범위' in ctx:return ctx.split('가 보이는')[0]+'의 '+value+'이 보이게 그려줘.'
 if ctx in ['로봇 자세','곰 자세','여우 동작','로봇 손 동작','로봇의 작업']:
  subject=ctx.split(' ')[0];return subject+'이 '+value.removesuffix('있다')+'있게 해줘.' if value.endswith('있다') else subject+'은 '+value+' 모습으로 그려줘.'
 if ctx in ['배경','배경 장소','여우가 있는 장소','하늘','하늘 색']:return value+'을 배경으로 그려줘.'
 if ctx in ['로봇의 표면 표현','꽃병 표면','탁자 표면']:return particle(ctx.replace('의 표면 표현','').replace(' 표면',''),'는','은')+' '+value+' 느낌으로 표현해줘.'
 if ctx=='창문에서 보이는 빛':return '창문에서 '+value+'이 나오게 그려줘.'
 if ctx=='땅과 지붕의 표현':return '땅과 지붕은 '+value+' 모습으로 표현해줘.'
 return particle(value,'를','을')+' '+('하늘에' if ctx=='하늘의 천체' else '장면에')+' 포함해줘.'
reports=[]
for n in range(1,11):
 day=f'day-{n:02}'; e=EDITORIAL[f'{n:02}']; original_path=ROOT/f'content/challenges/generated-10d-v2/{day}/manifest.private.json'
 old=json.loads(original_path.read_text()); p=copy.deepcopy(old)
 image=ROOT/f'apps/miniapp/public/content/challenges/generated-10d-v2/{day}.png'
 image_hash=hashlib.sha256(image.read_bytes()).hexdigest()
 excluded=e.get('exclude',{}); changes=e.get('changes',{})
 old_correct={k['condition_id']:k for k in old['correct_keywords']}
 candidates=[]; correct=[]; condition_records=[]; candidate_audit=[]
 for order,c in enumerate(p['conditions']):
  if n == 6:
   revised_context={'오리 인형 수':'오리 모양 수','오리 인형 색':'오리 모양 색','공 색':'원형 받침 색','오리 인형과 공':'오리 모양과 받침','오리 인형의 보이는 면':'오리 모양의 보이는 면'}.get(c['context'])
   if revised_context:
    c['requested_context']=c['context'];c['context']=revised_context
  key=c['id'].split('-c')[-1]; old_key=old_correct[c['id']]
  c['reviewer']='Codex AI'; c['reviewed_at']='2026-11-11'; c['image_sha256']=image_hash
  if key in excluded:
   c.update(observed_value=None,review_status='excluded_ambiguous',score_enabled=False,review_note=excluded[key]);condition_records.append(c);continue
  change=changes.get(key); value=change['value'] if change else c['requested_value']
  c.update(observed_value=value,scored_value=value,review_status='revised_to_observed' if change else 'confirmed',score_enabled=True,
           review_note=change['reason'] if change else e['observations'])
  condition_records.append(c)
  cid=c['id']; context=c['context']
  def keyword(v, is_correct):
   kid='k-'+hashlib.sha256((day+'|'+cid+'|'+v).encode()).hexdigest()[:16]
   label=public_label(context,v)
   return {'id':kid,'label':label,'value':v,'context':context,'condition_id':cid,'sentence_fragment':clause(c,v),'sentence_order':order,'review_status':'ai_reviewed','reason':e['observations'] if is_correct else '같은 대상/속성 범위에서 관찰된 '+value+'와 대비되는 선택지. '+e['observations']}
  k=keyword(value,True);correct.append(k);candidates.append(k)
  alternatives=[]
  for d in old['distractor_keywords']:
   if d.get('contradicts_condition_id')!=cid:continue
   v=d['label']
   if v==value or v==c['requested_value'] or v in alternatives:continue
   if v in e.get('reject_values',{}).get(key,[]):continue
   if v in ['바나나','수박','포도'] and day!='day-01':continue
   if key in changes and (n,key) in [(2,'09'),(5,'07'),(5,'10'),(6,'01'),(6,'04'),(10,'15')]:continue
   alternatives.append(v)
   if len(alternatives)==2:break
  manual={(2,'09'):['수채화','픽셀아트'],(5,'07'):['네 발이 지면에 닿은','누워 있는'],(5,'10'):['수채화','사진풍'],(6,'01'):['토끼 모양','고양이 모양'],(6,'04'):['정사각 받침','삼각 받침'],(10,'15'):['책을 읽고 있다','흙을 파고 있다']}
  alternatives=manual.get((n,key),alternatives)
  for v in alternatives:candidates.append(keyword(v,False))
 # New public labels are deliberately object-scoped; never render indistinguishable IDs.
 counts={k['label']:sum(q['label']==k['label'] for q in candidates) for k in candidates}
 for k in candidates:
  if counts[k['label']]>1:k['label']=k['context']+': '+k['value']
 # Review every old candidate, including discarded distractors and promoted style.
 for k in old['candidate_keywords']:
  original_answer=next((x for x in old['correct_keywords'] if x['id']==k['id']),None)
  d=next((x for x in old['distractor_keywords'] if x['id']==k['id']),None)
  cid=(original_answer or {}).get('condition_id') or (d or {}).get('contradicts_condition_id')
  cond=next((x for x in condition_records if x['id']==cid),None)
  matching=next((x for x in candidates if x['condition_id']==cid and x['value']==k['label']),None)
  if matching: disposition='retained_correct' if matching in correct else 'retained_distractor';reason=matching['reason']
  elif not cid:disposition='removed_unrelated_detail';reason='무관한 추가 장면 묘사로 핵심 변수 학습과 무관하여 제거. '+e['observations']
  elif not cond['score_enabled']:disposition='removed_ambiguous_condition';reason=cond['review_note']
  else:disposition='replaced_or_trimmed';reason='같은 속성의 명확한 정답/대비 후보로 정리. 모호한 스타일·무관한 과일·중복 후보는 사용하지 않음. '+cond['review_note']
  candidate_audit.append({'old_id':k['id'],'old_label':k['label'],'context':k.get('context'),'condition_id':cid,'disposition':disposition,'reason':reason})
 p.update(version='aimi-puzzle-pack-v3-reviewed',published=False,authored_by='Codex_AI_visual_and_editorial_review_2026-11-11',
          correct_keywords=correct,distractor_keywords=[dict(k,contradicts_condition_id=k['condition_id'],distractor_kind='reviewed_contrast') for k in candidates if k not in correct],
          candidate_keywords=sorted(candidates,key=lambda k:k['id']),display_labels={k['id']:k['label'] for k in candidates},answer_count=len(correct),
          total_candidate_count=len(candidates),answer_ratio=len(correct)/len(candidates),answer_prompt=e['answer_prompt'])
 p['original_generation']={'authored_prompt':old['authored_prompt'],'prompt_format':old['prompt_format'],'model_plan':copy.deepcopy(old['model_plan']),'original_asset_sha256':old['assets']['sha256'],'source_manifest':str(original_path.relative_to(ROOT)),'source_manifest_sha256':hashlib.sha256(original_path.read_bytes()).hexdigest()}
 p['assets'].update(sha256=image_hash,app_target=f'/content/challenges/generated-10d-v2/{day}.png',render_policy='contain_preserve_entire_reviewed_image')
 p['tips']=[{'id':day+'-writing-'+str(i+1),'title':t[0],'text':t[1],'scope':'daily_editorial','source_ids':['visual-review-'+day],'approval':'approved','reviewer_kind':'ai','requires_actual_model_match':False} for i,t in enumerate(e['points'])]
 source=e['model_source'];title,text=e['model_tip']
 p['tips'].append({'id':day+'-model-reviewed','title':title,'text':text,'scope':SOURCES[source]['scope'],'source_ids':[source,'visual-review-'+day], 'approval':'approved','reviewer_kind':'ai','requires_actual_model_match':True,'applicable_model_ids':[old['model_plan']['actual_model_id']], 'source_label':SOURCES[source]['title']})
 p['model_plan']['model_tips_enabled']=True
 p['learning_feedback']={'prompt_format':old['prompt_format'],'scene_explanation':e['answer_prompt'],'visual_notes':e['observations'],'writing_point_ids':[t['id'] for t in p['tips'][:2]],'model_note_id':p['tips'][2]['id'],'source_ids':[source],'source_tip_id':SOURCES[source]['legacy_tip_id'],'sources_checked_at':'2026-11-11','reviewer_kind':'ai'}
 # Highlights refer to the corrected answer example, never silently rewritten generation input.
 p['highlights']=[]
 for k in correct:
  value=k['value'];start=e['answer_prompt'].find(value)
  if start<0:continue
  p['highlights'].append({'keyword_id':k['id'],'condition_id':k['condition_id'],'matched_text':value,'start_utf16':start,'end_utf16':start+len(value)})
 p['review']={'status':'approved','reviewer':'Codex AI','reviewer_kind':'ai','reviewed_at':'2026-11-11','approved_at':'2026-11-11','review_basis':'user_requested_ai_visual_editorial_review','asset_sha256':image_hash,'condition_count':len(condition_records),'candidate_count_reviewed':len(candidate_audit),'notes':e['observations'],'events':old['review'].get('events',[])+[{'event':'visual_and_editorial_review','at':'2026-11-11','reviewer_kind':'ai'}]}
 p['scoring'].update(rule_version='aimi-keyword-set-v4',release_ready=True,content_revision='reviewed-10d-v3')
 p['economy']={'policy_version':'aimi-economy-v3','status':'bound_to_shared_app_policy'}
 p['feedback_policy']={'initial_answer_count_visible':False,'answer_count_hint_cost':15,'attempt_cost':30,'incorrect_selected_cards_from_attempt':1,'missing_answer_ids_revealed':False,'reveal_after_terminal':True}
 p['delivery']['release_blockers']=[]
 canonical=json.dumps(p,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode();digest=hashlib.sha256(canonical).hexdigest()
 p['content_sha256']=digest;p['version']+='-'+digest[:12]
 directory=OUT/day;write(directory/'manifest.private.json',p)
 review={'day':day,'image_path':str(image.relative_to(ROOT)),'image_sha256':image_hash,'reviewer_kind':'ai','conditions':condition_records,'old_candidates':candidate_audit,'notes':e['observations']}
 write(directory/'review.json',review)
 write(directory/'preview.public.json',{'id':day,'title':p['title'],'version':p['version'],'target':p['assets']['app_target'],'candidate_keywords':[{'id':k['id'],'label':k['label'],'context':k['context'],'sentence_fragment':k['sentence_fragment'],'sentence_order':k['sentence_order']} for k in candidates]})
 reports.append({'id':day,'model':old['model_plan']['actual_model_id'],'format':old['prompt_format'],'old_answers':len(old['correct_keywords']),'new_answers':len(correct),'old_candidates':len(old['candidate_keywords']),'new_candidates':len(candidates),'excluded':excluded,'changes':changes,'notes':e['observations'],'content_version':p['version']})
write(OUT/'sources.json',SOURCES);write(OUT/'review-summary.json',reports)
print(json.dumps({'days':len(reports),'conditions_reviewed':sum(len(json.loads((OUT/r['id']/'review.json').read_text())['conditions']) for r in reports),'old_candidates_reviewed':sum(r['old_candidates'] for r in reports),'new_candidates':sum(r['new_candidates'] for r in reports),'answer_counts':[r['new_answers'] for r in reports]},ensure_ascii=False))
