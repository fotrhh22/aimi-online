# coding: utf-8
"""Scan tracked file content; never print matched credential values."""
import pathlib, re, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[2]
patterns={
 'Google API key':re.compile(rb'AIza[0-9A-Za-z_-]{35}'),
 'OpenRouter API key':re.compile(rb'sk-or-v1-[0-9a-fA-F]{40,}'),
 'GitHub token':re.compile(rb'gh[pousr]_[0-9A-Za-z]{30,}'),
 'Private key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
}
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).split(b'\0')
fail=[]
for name in files:
 if not name:continue
 relative=name.decode();path=root/relative
 if not path.is_file():continue
 data=path.read_bytes()
 for kind,pattern in patterns.items():
  if pattern.search(data):fail.append((relative,kind))
for name,kind in fail:print(f'{name}: possible {kind} (value hidden)')
print(f'Credential scan: {len(fail)} finding(s)')
sys.exit(bool(fail))
