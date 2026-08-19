import json
import subprocess
import time
from pathlib import Path
import requests
import websocket

PORT = 9227
PROFILE = '/tmp/lutcalc-cdp-tweaks'
URL = 'http://127.0.0.1:3000/lutcalc/index.html'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(80):
        try:
            targets = requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json()
            page = next(x for x in targets if x.get('type') == 'page')
            break
        except Exception:
            time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=15)
    ident = 0
    def cdp(method, params=None):
        global ident
        ident += 1
        ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(ws.recv())
            if response.get('id') == ident:
                return response
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Page.navigate', {'url': URL}); time.sleep(5)
    expression = '''(() => [...document.querySelectorAll('#tweaksholder > div')].map((holder, i) => ({
      index: i,
      className: holder.className,
      text: holder.innerText.trim().slice(0, 1800),
      controls: [...holder.querySelectorAll('input,select,button')].map((e, j) => ({
        index: j, tag: e.tagName, type: e.type || '', name: e.name || '', value: e.value || '', checked: !!e.checked,
        min: e.min || '', max: e.max || '', step: e.step || '', text: e.textContent.trim(),
        options: e.tagName === 'SELECT' ? [...e.options].slice(0, 20).map(o => ({value:o.value, text:o.textContent.trim()})) : []
      }))
    })))()'''
    result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    data = result['result']['result'].get('value')
    Path('/home/ubuntu/lutcalc-redesign/research/tweak-controls.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(json.dumps(data, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
