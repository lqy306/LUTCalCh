import json
p=json.load(open('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json'))
for item in p.get('selects',[]):
    options=item.get('options',[])
    print(item.get('i'), item.get('value'), item.get('name'), item.get('id'), len(options), options[:8])
