import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9232
PROFILE = '/tmp/lutcalc-real-lut-panel'
URL = 'http://127.0.0.1:3000/'
OUT = '/home/ubuntu/lutcalc-redesign/research/lut-real-browser.png'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu',
    '--hide-scrollbars', '--window-size=1280,1600', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(100):
        try:
            pages = requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json()
            page = next((x for x in pages if x.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(0.2)
    if not page:
        raise RuntimeError('Chromium page did not start')
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
    ident = 0
    def cdp(method, params=None):
        nonlocal_ident = None
        global ident
        ident += 1
        ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            result = json.loads(ws.recv())
            if result.get('id') == ident:
                return result
    def evaluate(expression):
        result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
        return result.get('result', {}).get('result', {}).get('value')

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Page.navigate', {'url': URL})
    time.sleep(8)
    before = evaluate("(() => { const item=document.querySelector('.adjustment-item:not(.adjustment-lut-item)'); return {url:location.href, count:document.querySelectorAll('.adjustment-lut-item').length, panel:!!document.querySelector('.lut-analysis-panel'), text:document.querySelector('.adjustment-lut-item')?.innerText || '', regularSvg:item?.querySelectorAll('.adjustment-chevron').length || 0, regularDetails:!!item?.querySelector('.adjustment-details'), regularCheckbox:!!item?.querySelector('input[type=checkbox]')}; })()")
    clicked = evaluate("(() => { const el=document.querySelector('.adjustment-lut-item .adjustment-item-main'); if (!el) return false; el.click(); return true; })()")
    time.sleep(1)
    after = evaluate("(() => { const item=document.querySelector('.adjustment-lut-item'); const panel=document.querySelector('.lut-analysis-panel'); const style=panel ? getComputedStyle(panel) : null; return {clicked:true, panel:!!panel, panelDisplay:style?.display || '', panelHeight:panel?.getBoundingClientRect().height || 0, input:!!item?.querySelector('input[type=file]'), buttons:[...item?.querySelectorAll('button') || []].map(x=>x.innerText), expanded:item?.classList.contains('is-expanded') || false, itemClass:item?.className || '', parentClass:item?.parentElement?.className || '', shellClass:item?.closest('[class*=shell]')?.className || '', matched:!!item?.closest('.apple-app-shell')}; })()")
    cdp('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True, 'fromSurface': True})
    shot = cdp('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True, 'fromSurface': True})
    Path(OUT).write_bytes(__import__('base64').b64decode(shot['result']['data']))
    regular = evaluate("(() => { const item=document.querySelector('.adjustment-item:not(.adjustment-lut-item)'); const checkbox=item?.querySelector('input[type=checkbox]'); checkbox?.click(); return {regularSvg:item?.querySelectorAll('.adjustment-chevron').length || 0, regularDetails:!!item?.querySelector('.adjustment-details'), active:item?.classList.contains('is-active'), checkbox:checkbox?.checked || false}; })()")
    print(json.dumps({'before': before, 'clicked': clicked, 'after': after, 'regularAfterCheckbox': regular, 'screenshot': OUT}, ensure_ascii=False, indent=2))
finally:
    try:
        ws.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
