"""PDF-source-inspired editable vector examples. No AI/network/full-screen screenshots."""
from pathlib import Path
from itertools import product
p=Path(__file__).resolve().parents[2]/'apps/miniapp/public/content'
p.mkdir(parents=True,exist_ok=True)
colors={'seed':'#8AD49C','bunny':'#F5D3D8','bear':'#D3AA7B','cloud':'#C8B9E8'}
for kind,col in colors.items():
 ears={'seed':'<ellipse cx="38" cy="20" rx="14" ry="8" fill="#379666"/><ellipse cx="64" cy="15" rx="15" ry="8" fill="#379666"/>','bunny':'<rect x="28" y="0" width="15" height="40" rx="7"/><rect x="57" y="0" width="15" height="40" rx="7"/>','bear':'<circle cx="26" cy="33" r="12"/><circle cx="74" cy="33" r="12"/>','cloud':'<circle cx="26" cy="34" r="14"/><circle cx="50" cy="26" r="17"/><circle cx="74" cy="34" r="14"/>'}[kind]
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><ellipse cx="50" cy="94" rx="32" ry="8" fill="#B6C7B0"/><g fill="{col}">{ears}<rect x="18" y="24" width="64" height="60" rx="24"/><ellipse cx="32" cy="84" rx="11" ry="8"/><ellipse cx="68" cy="84" rx="11" ry="8"/></g><g fill="#242820"><circle cx="39" cy="52" r="3.1"/><circle cx="61" cy="52" r="3.1"/></g><path d="M43 62Q50 74 57 62" fill="none" stroke="#242820" stroke-width="2"/></svg>'
 (p/f'{kind}.svg').write_text(svg)
items={
 'plant':'<path d="M40 64L46 92H74L80 64Z" fill="#B99673"/><rect x="36" y="59" width="48" height="10" rx="3" fill="#C6A27B"/><path d="M60 60V25" stroke="#527A41" stroke-width="5"/><ellipse cx="47" cy="34" rx="16" ry="9" fill="#79AD77"/><ellipse cx="73" cy="21" rx="17" ry="9" fill="#79AD77"/>',
 'flower':'<path d="M60 88V42" stroke="#86BB88" stroke-width="4"/><circle cx="60" cy="35" r="17" fill="#DFA6B6"/>',
 'bench':'<rect x="10" y="38" width="100" height="20" rx="4" fill="#B99673"/><rect x="18" y="58" width="8" height="27" rx="2" fill="#9E7E5B"/><rect x="94" y="58" width="8" height="27" rx="2" fill="#9E7E5B"/>',
 'fence':''.join(f'<rect x="{14+i*22}" y="20" width="6" height="54" rx="2" fill="#B99673"/>'for i in range(5))+'<rect x="8" y="39" width="110" height="7" rx="2" fill="#B99673"/>'}
for k,body in items.items():(p/f'{k}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110">{body}</svg>')
axes=[['none','apple','pear'],['none','one','two','three'],['none','red','blue','green'],['none','white','black'],['none','above','side'],['none','watercolor','photo','cartoon']]
symbols=[]
for subject,count,color,bg,view,style in product(*axes):
 key='-'.join([subject,count,color,bg,view,style]);fill={'red':'#D65A4C','blue':'#6E98BF','green':'#83A56C','none':'#B6B6AC'}[color]
 body=f'<rect width="330" height="145" rx="16" fill="{"#272B28" if bg=="black" else "#F8F5EE" if bg=="white" else "#E6E6E2"}"/>'
 n={'none':1,'one':1,'two':2,'three':3}[count]
 if subject!='none':
  for i in range(n):
   x=165+(i-(n-1)/2)*85;y=77;stroke=' stroke="#34412E" stroke-width="2"'if style=='cartoon' else ''
   if subject=='apple':body+=f'<path d="M{x} {y-19}C{x-30} {y-38} {x-39} {y+12} {x-14} {y+24}Q{x} {y+32} {x+14} {y+24}C{x+39} {y+12} {x+30} {y-38} {x} {y-19}Z" fill="{fill}"{stroke}/>'
   else:body+=f'<path d="M{x-7} {y-27}Q{x-11} {y-3} {x-23} {y+3}C{x-42} {y+38} {x+42} {y+38} {x+23} {y+3}Q{x+11} {y-3} {x+7} {y-27}Z" fill="{fill}"{stroke}/>'
   body+=f'<path d="M{x} {y-20}L{x+3} {y-36}" stroke="#6A6640" stroke-width="3"/><ellipse cx="{x+11}" cy="{y-31}" rx="11" ry="5" fill="#668A51"/>'
   if view=='side':body+=f'<ellipse cx="{x}" cy="{y+31}" rx="30" ry="3" fill="#4C5944" opacity=".15"/>'
   if style=='photo':body+=f'<ellipse cx="{x-10}" cy="{y-4}" rx="5" ry="10" fill="white" opacity=".3"/>'
 if style=='watercolor':body+='<rect width="330" height="145" rx="16" fill="#F8F5EE" opacity=".09"/>'
 symbols.append(f'<symbol id="{key}" viewBox="0 0 330 145">{body}</symbol>')
(p/'challenges.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">'+''.join(symbols)+'</svg>')
print('Prepared 8 PDF-based vector assets and',len(symbols),'development result symbols in one atlas.')
