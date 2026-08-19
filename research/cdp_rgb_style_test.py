import base64
import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9233
PROFILE = '/tmp/lutcalc-rgb-style'
URL = 'http://127.0.0.1:3000/'
OUT = '/home/ubuntu/lutcalc-redesign/research/rgb-style-dark-browser.png'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=1366,1400', '--remote-allow-origins=*',
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
    evaluate("document.documentElement.classList.add('dark'); document.documentElement.dataset.workbenchMode='dark'; true")
    result = evaluate("(() => { const item=[...document.querySelectorAll('.adjustment-item:not(.adjustment-lut-item)')].find(x=>x.innerText.includes('RGB 采样器')); const cb=item?.querySelector('input[type=checkbox]'); cb?.click(); return {found:!!item, checked:cb?.checked || false, active:item?.classList.contains('is-active'), details:!!item?.querySelector('.adjustment-details'), select:item?.querySelector('select')?.value || '', selectWidth:item?.querySelector('select')?.getBoundingClientRect().width || 0, nameColor:item ? getComputedStyle(item.querySelector('.adjustment-item-name')).color : '', summaryColor:item ? getComputedStyle(item.querySelector('.adjustment-item-summary')).color : '', rowBackground:item ? getComputedStyle(item.querySelector('.adjustment-item-main')).backgroundColor : ''}; })()")
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
