import json
import subprocess
import time

import requests
import websocket

PORT = 9241
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}','--user-data-dir=/tmp/lut-title-inspect','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(80):
        try:
            page = next((x for x in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if x.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
    ident = 0
    def evaluate(expression):
        global ident
        ident += 1
        ws.send(json.dumps({'id': ident, 'method': 'Runtime.evaluate', 'params': {'expression': expression, 'returnByValue': True}}))
        while True:
            result = json.loads(ws.recv())
            if result.get('id') == ident:
                return result['result']['result'].get('value')
    ident += 1
    ws.send(json.dumps({'id': ident, 'method': 'Page.navigate', 'params': {'url': 'http://127.0.0.1:3000/'}}))
    while True:
        result = json.loads(ws.recv())
        if result.get('id') == ident:
            break
    time.sleep(6)
    print(json.dumps(evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      const select=[...(d?.querySelectorAll('#box-twk select') || [])][20];
      const holder=select?.closest('.tweakholder') || select?.parentElement?.parentElement;
      return {
        select:select?.outerHTML || '',
        holder:holder?.outerHTML?.slice(0,5000) || '',
        inputs:[...(holder?.querySelectorAll('input') || [])].map(x=>({type:x.type,value:x.value,outer:x.outerHTML}))
      };
    })()"""), ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
