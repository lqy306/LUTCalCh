import json
p=json.load(open('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json'))
for x in p.get('inputs',[]):
    if x.get('type') in ['text','file','button','submit']:
        print(x)
print('BUTTONS')
for x in p.get('buttons',[]): print(x)
