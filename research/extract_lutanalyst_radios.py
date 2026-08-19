import json
p=json.load(open('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json'))
for x in p.get('inputs',[]):
    if x.get('type') == 'radio':
        print(x)
