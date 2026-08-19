import json
import subprocess
import time
import requests
import websocket

PORT = 9229
PROFILE = '/tmp/lutcalc-cdp-black-gamma'
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
            if result.get('id') == ident:
                return result
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Page.navigate', {'url': URL}); time.sleep(7)
    open_expr = '''(() => { const item=[...document.querySelectorAll('.adjustment-item')].find(e=>e.querySelector('.adjustment-item-name')?.textContent.trim()==='黑伽马'); if(!item) return {ok:false,reason:'module not found'}; item.querySelector('.adjustment-item-main')?.click(); return {ok:true}; })()'''
    opened = cdp('Runtime.evaluate', {'expression': open_expr, 'returnByValue': True})['result']['result'].get('value')
    time.sleep(.5)
    change_expr = '''(() => { const item=[...document.querySelectorAll('.adjustment-item')].find(e=>e.querySelector('.adjustment-item-name')?.textContent.trim()==='黑伽马'); const number=item?.querySelector('input[type=number]'); if(!number) return {ok:false,reason:'Power input not found'}; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(number,'2.5'); number.dispatchEvent(new Event('input',{bubbles:true})); number.dispatchEvent(new Event('change',{bubbles:true})); return {ok:true,nativeValue:number.value}; })()'''
    changed = cdp('Runtime.evaluate', {'expression': change_expr, 'returnByValue': True})['result']['result'].get('value')
    time.sleep(1)
    engine_expr = '''(() => { const f=document.querySelector('iframe.engine-frame'); const d=f?.contentDocument; const h=d?.querySelectorAll('#tweaksholder > div')[8]; return {engineRanges:[...h?.querySelectorAll('input[type=range]')||[]].map(x=>x.value),engineNumbers:[...h?.querySelectorAll('input[type=number]')||[]].map(x=>x.value),expanded:!!document.querySelector('.adjustment-item.is-expanded .adjustment-item-name')}; })()'''
    engine = cdp('Runtime.evaluate', {'expression': engine_expr, 'returnByValue': True})['result']['result'].get('value')
    print(json.dumps({'opened':opened,'changed':changed,'engine':engine}, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
