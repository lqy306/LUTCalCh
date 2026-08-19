import json
import os
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9223
USER_DATA = '/tmp/lutcalc-cdp-profile'
URL = 'http://127.0.0.1:3000/lutcalc/index.html'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={USER_DATA}',
    'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    for _ in range(60):
        try:
            targets = requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json()
            page = next(item for item in targets if item.get('type') == 'page')
            break
        except Exception:
            time.sleep(0.2)
    else:
        raise RuntimeError('Chrome DevTools target did not start')

    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=10)
    counter = 0

    def cdp(method, params=None):
        nonlocal_counter = None
        global counter
        counter += 1
        ws.send(json.dumps({'id': counter, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(ws.recv())
            if response.get('id') == counter:
                return response

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Page.navigate', {'url': URL})
    time.sleep(5)

    expression = '''(() => ({
      url: location.href,
      ready: document.readyState,
      selects: [...document.querySelectorAll('select')].map((e, i) => ({
        i, name: e.name, id: e.id, value: e.value,
        selected: e.options[e.selectedIndex]?.textContent,
        options: [...e.options].slice(0, 160).map(o => ({value:o.value, text:o.textContent.trim()})), parent: e.parentElement?.textContent?.trim().slice(0,180)
      })),
      files: [...document.querySelectorAll('input[type=file]')].map((e, i) => ({i, id:e.id, name:e.name, accept:e.accept, parent:e.parentElement?.parentElement?.textContent?.trim().slice(0,300), html:e.outerHTML})),
      buttons: [...document.querySelectorAll('input[type=button],button')].map((e, i) => ({i, id:e.id, value:e.value, text:e.textContent.trim(), cls:e.className})).slice(-80),
      tweakInputs: [...document.querySelectorAll('#box-twk input, #box-twk select')].map((e, i) => ({i, tag:e.tagName, type:e.type, name:e.name, id:e.id, value:e.value, checked:e.checked, text:e.parentElement?.textContent?.trim().slice(0,120)})).slice(0, 250)
    }))()'''
    result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    value = result['result']['result'].get('value')
    print(json.dumps(value, ensure_ascii=False, indent=2))
finally:
    try:
        ws.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
