import base64
import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9234
PROFILE = '/tmp/lutcalc-workflow-empty'
URL = 'http://127.0.0.1:3000/'
OUT = '/home/ubuntu/lutcalc-redesign/research/workflow-empty-browser.png'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1366,900', '--remote-allow-origins=*', f'--remote-debugging-port={PORT}',
    f'--user-data-dir={PROFILE}', 'about:blank'
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
        time.sleep(0.2)
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
    result = evaluate("(() => { const el=document.querySelector('.workflow-empty'); const s=el ? getComputedStyle(el) : null; return {found:!!el, text:el?.innerText || '', width:el?.getBoundingClientRect().width || 0, height:el?.getBoundingClientRect().height || 0, background:s?.backgroundColor || '', border:s?.border || '', color:s?.color || ''}; })()")
    shot = cdp('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True, 'fromSurface': True})
    Path(OUT).write_bytes(base64.b64decode(shot['result']['data']))
    print(json.dumps({'result': result, 'screenshot': OUT}, ensure_ascii=False, indent=2))
finally:
    try:
        ws.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
