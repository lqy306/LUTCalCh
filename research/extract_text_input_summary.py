import json
p=json.load(open('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json'))
for x in p.get('inputs',[]):
    if x.get('type') == 'text':
        print(x.get('i'), repr(x.get('value')), x.get('name'), x.get('id'), x.get('className'))
