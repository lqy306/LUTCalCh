import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9235
PROFILE = '/tmp/lutcalc-audit-lutanalyst'
URL = 'http://127.0.0.1:3000/'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(100):
        try:
            page = next((x for x in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if x.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
    ident = 0
    def cdp(method, params=None):
        global ident
        ident += 1
        ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            result = json.loads(ws.recv())
            if result.get('id') == ident:
                return result
    def evaluate(expression):
        result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
        return result.get('result', {}).get('result', {}).get('value')
    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Page.navigate', {'url': URL})
    time.sleep(7)
    audit = evaluate("""(() => { const d=document.querySelector('iframe')?.contentDocument; const box=d?.querySelector('#box-twk'); if(!box) return {error:'no box'}; return {text:box.innerText, inputs:[...box.querySelectorAll('input')].map((x,i)=>({i,type:x.type,value:x.value,name:x.name,id:x.id,checked:x.checked,disabled:x.disabled})), selects:[...box.querySelectorAll('select')].map((x,i)=>({i,value:x.value,name:x.name,id:x.id,options:[...x.options].map(o=>o.text)})), buttons:[...box.querySelectorAll('button,input[type=button],input[type=submit]')].map((x,i)=>({i,text:x.textContent,value:x.value,id:x.id,className:x.className})), html:box.innerHTML.slice(0,24000)}; })()""")
    Path('/home/ubuntu/lutcalc-redesign/research/lutanalyst-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2))
    print(json.dumps(audit, ensure_ascii=False, indent=2)[:20000])
finally:
    try:
        ws.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
