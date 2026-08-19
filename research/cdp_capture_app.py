import base64
import json
import subprocess
import time
from pathlib import Path
import requests
import websocket

PORT = 9228
PROFILE = '/tmp/lutcalc-cdp-capture'
URL = 'http://127.0.0.1:3000/'
OUTPUT = '/home/ubuntu/lutcalc-redesign/research/adjustments-refactor-desktop.png'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', '--window-size=1440,1000', 'about:blank'
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
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': False})
    cdp('Page.navigate', {'url': URL}); time.sleep(8)
    cdp('Runtime.evaluate', {'expression': 'window.scrollTo(0, document.body.scrollHeight);'})
    time.sleep(1)
    shot = cdp('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True})
    Path(OUTPUT).write_bytes(base64.b64decode(shot['result']['data']))
    print(OUTPUT)
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
