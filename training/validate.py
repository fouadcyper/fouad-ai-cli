#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('input',type=Path);a=p.parse_args();seen=set();valid=[]
for number,line in enumerate(a.input.read_text(encoding='utf-8').splitlines(),1):
    row=json.loads(line); messages=row.get('messages');
    if not isinstance(messages,list) or not messages: raise ValueError(f'line {number}: messages required')
    digest=hashlib.sha256(json.dumps(row,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    if digest not in seen: seen.add(digest);valid.append(row)
print(json.dumps({'valid':len(valid),'duplicates_removed':number-len(valid)},indent=2))
