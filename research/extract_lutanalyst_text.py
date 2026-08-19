import json
p=json.load(open('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json'))
text=p.get('text','')
for key in ['LUTAnalyst','LUT Title','Analysis Dimension','Analysis Method','LUT Range','Analyse','New LUT']:
    index=text.lower().find(key.lower())
    print('\n===', key, index, '===')
    if index >= 0:
        print(text[max(0,index-500):index+1800])
