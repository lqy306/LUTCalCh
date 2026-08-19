import json
import subprocess
import time
import requests
import websocket

PORT = 9230
PROFILE = '/tmp/lutcalc-cdp-adjustment-state'
URL = 'http://127.0.0.1:3000/'
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}',f'--user-data-dir={PROFILE}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(80):
        try:
            page = next(x for x in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if x.get('type') == 'page')
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
            result = json.loads(ws.recv())
            if result.get('id') == ident: return result
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Page.navigate', {'url': URL}); time.sleep(7)
    expr = '''(() => {
      const master = document.querySelector('.adjustments-master-toggle input');
      const items = [...document.querySelectorAll('.adjustment-item:not(.adjustment-lut-item)')];
      const lut = document.querySelector('.adjustment-lut-item');
      const themeButton = document.querySelector('.theme-mode-button');
      themeButton?.click();
      const panel = items[0]?.querySelector('.adjustment-item-main');
      panel?.click();
      return {masterChecked:!!master?.checked, moduleCount:items.length, checkedModules:items.filter(e=>e.querySelector('input[type=checkbox]')?.checked).map(e=>e.querySelector('.adjustment-item-name')?.textContent.trim()), lutCheckboxCount:lut?.querySelectorAll('input[type=checkbox]').length || 0, modeButton:themeButton?.textContent.trim()};
    })()'''
    time.sleep(.3)
    result = cdp('Runtime.evaluate', {'expression': expr, 'returnByValue': True})['result']['result'].get('value')
    time.sleep(.5)
    lut_result = cdp('Runtime.evaluate', {'expression': "(() => { const lut=document.querySelector('.adjustment-lut-item'); lut?.querySelector('.adjustment-item-main')?.click(); return true; })()", 'returnByValue': True})['result']['result'].get('value')
    time.sleep(.5)
    result['lutExpanded'] = cdp('Runtime.evaluate', {'expression': "(() => { const lut=document.querySelector('.adjustment-lut-item'); return {fileInputs:lut?.querySelectorAll('input[type=file]').length || 0, buttons:[...lut?.querySelectorAll('.adjustment-details button')||[]].map(e=>e.textContent.trim()), checkboxCount:lut?.querySelectorAll('input[type=checkbox]').length || 0}; })()", 'returnByValue': True})['result']['result'].get('value')
    colors = cdp('Runtime.evaluate', {'expression': '''(() => { const card=document.querySelector('.adjustments-card'); const item=document.querySelector('.adjustment-item'); const details=document.querySelector('.adjustment-details'); const s=e=>e?getComputedStyle(e).backgroundColor:null; return {card:s(card),item:s(item),details:s(details),root:document.documentElement.getAttribute('data-workbench-mode')}; })()''', 'returnByValue': True})['result']['result'].get('value')
    print(json.dumps({'state':result,'colors':colors}, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
