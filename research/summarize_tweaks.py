import json
from pathlib import Path
items=json.loads(Path('/home/ubuntu/lutcalc-redesign/research/tweak-controls.json').read_text())
for item in items:
    print(f"\nMODULE {item['index']} {item['text'][:80]}")
    for control in item['controls']:
        if control['type'] in {'checkbox','number','range','text','radio','select-one'} or control['value']:
            opts=' / '.join(x['text'] for x in control.get('options',[])[:8])
            print(f"  {control['index']}: {control['tag']} {control['type']} value={control['value']} checked={control['checked']} min={control['min']} max={control['max']} step={control['step']} opts={opts}")
