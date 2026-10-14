"""Pack walked gold commits for learn/judge.js and learn/gold.js (the learn-gold branch): per commit its meta.json,
its summary.json, its history label (label.json from the data dir, if any) and the crops the judge is shown, as
JPEG (a quarter of the PNG's size, for a branch people clone). The findings shown are the ones judge.js shows and
the gold page showed: no repeats, coverage or noise (flaky.json), those with a crop first, at most four.
usage: python3 learn/gold-pack.py <walkedDir>/<repo> <dataDir>/<repo> <goldDir>/<repo>
  <walkedDir>/<repo>: walk.js --only <shas> --keep-images output; <dataDir>/<repo>: the learn-data repository
  dir (label.json and flaky.json). Needs Pillow."""
import json, os, shutil, sys
from PIL import Image

MAX_FINDINGS = 4
walked, data, out = sys.argv[1:4]
flaky = set(json.load(open(f'{data}/flaky.json'))) if os.path.exists(f'{data}/flaky.json') else set()
sig = lambda p, f: '|'.join(str(x if x is not None else '') for x in [p.get('page'), p.get('state'), p.get('vp'), f['type'], f['path'], *f['changes']])
os.makedirs(out, exist_ok=True)
if flaky: shutil.copy(f'{data}/flaky.json', f'{out}/flaky.json')
n = 0
for sha in sorted(os.listdir(walked)):
    d = f'{walked}/{sha}'
    if not os.path.exists(f'{d}/summary.json'): continue
    s = json.load(open(f'{d}/summary.json'))
    fs = [(p, f) for p in s['pages'] for f in p['findings'] if not f.get('sameAs') and f['type'] != 'coverage' and sig(p, f) not in flaky]
    with_img = [(p, f) for p, f in fs if f.get('image') and os.path.exists(f"{d}/{f['image']}")]
    keep = {id(f) for _, f in with_img[:MAX_FINDINGS]}
    o = f'{out}/{sha}'; os.makedirs(o, exist_ok=True)
    for p in s['pages']:
        for f in p['findings']:
            if id(f) in keep:
                name = os.path.splitext(f['image'])[0] + '.jpg'
                Image.open(f"{d}/{f['image']}").convert('RGB').save(f'{o}/{name}', 'JPEG', quality=92)
                f['image'] = name
            else: f.pop('image', None)
    json.dump(s, open(f'{o}/summary.json', 'w'))
    shutil.copy(f'{d}/meta.json', f'{o}/meta.json')
    if os.path.exists(f'{data}/{sha}/label.json'): shutil.copy(f'{data}/{sha}/label.json', f'{o}/label.json')
    n += 1
print(f'{n} commit(s) packed into {out}')
