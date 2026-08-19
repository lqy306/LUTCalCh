import json
from pathlib import Path

p = json.loads(Path('/tmp/lutcalc-app-inspect-2.json').read_text())
for i, frame in enumerate(p.get('frames', [])):
    print('FRAME', i, frame.get('src'))
    print('FILES', frame.get('files'))
    print('BUTTONS')
    for button in frame.get('buttons', []):
        text = (button.get('value') or '') + ' ' + (button.get('text') or '')
        if any(word in text.lower() for word in ['analyse', '分析', 'save cube', '生成', 'lut']):
            print(button)
    print('SELECTS')
    for select in frame.get('selects', []):
        labels = [x.get('text', '') for x in select.get('options', [])]
        if any('Fujifilm F-Log' in x or x == 'Rec709' or 'F-Log' in x for x in labels):
            print(select.get('j'), select.get('selected'), select.get('value'), [x for x in labels if 'Fujifilm' in x or x == 'Rec709' or 'F-Log' in x][:20])
