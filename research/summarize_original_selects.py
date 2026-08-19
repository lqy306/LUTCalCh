import json
from pathlib import Path
p=json.loads(Path('/tmp/lutcalc-inspect-3.json').read_text())
for s in p['selects'][:23]:
    print(s.get('i'), s.get('selected'), '|', (s.get('parent') or '')[:220])
