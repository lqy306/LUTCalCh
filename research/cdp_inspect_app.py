import json
import subprocess
import time
import requests
import websocket

PORT = 9225
PROFILE = '/tmp/lutcalc-cdp-app'
URL = 'https://lutcalcapp-s8bmtac7.manus.space/'

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
            r = json.loads(ws.recv())
            if r.get('id') == ident:
                return r
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('DOM.enable')
    cdp('Page.navigate', {'url': URL})
    time.sleep(8)
    expr = '''(() => ({
      url: location.href,
      inputs: [...document.querySelectorAll('input')].map((e,i)=>({i,type:e.type,value:e.value,checked:e.checked,accept:e.accept,placeholder:e.placeholder,parent:e.parentElement?.parentElement?.textContent?.trim().slice(0,180),html:e.outerHTML})),
      frames: [...document.querySelectorAll('iframe')].map((f,i)=>({i,src:f.src,files:[...(f.contentDocument?.querySelectorAll('input[type=file]')||[])].map((e,j)=>({j,html:e.outerHTML,parent:e.parentElement?.parentElement?.textContent?.trim().slice(0,260)})),buttons:[...(f.contentDocument?.querySelectorAll('input[type=button],button')||[])].map((e,j)=>({j,value:e.value,text:e.textContent.trim(),parent:e.parentElement?.textContent?.trim().slice(0,120)})).slice(-30),selects:[...(f.contentDocument?.querySelectorAll('select')||[])].map((e,j)=>({j,value:e.value,selected:e.selectedOptions?.[0]?.textContent,options:[...e.options].slice(0,100).map(o=>({value:o.value,text:o.textContent.trim()}))})).slice(-20)})),
      selects: [...document.querySelectorAll('select')].map((e,i)=>({i,value:e.value,selected:e.selectedOptions?.[0]?.textContent,options:[...e.options].slice(0,120).map(o=>({value:o.value,text:o.textContent.trim()})),parent:e.parentElement?.textContent?.trim().slice(0,180)})),
      buttons: [...document.querySelectorAll('button')].map((e,i)=>({i,text:e.textContent.trim(),aria:e.getAttribute('aria-label'),title:e.title,parent:e.parentElement?.textContent?.trim().slice(0,180)}))
    }))()'''
    result = cdp('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
    print(json.dumps(result['result']['result'].get('value'), ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
