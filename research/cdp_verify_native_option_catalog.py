import json
import subprocess
import time

import requests
import websocket

PORT = 9237
PROFILE = '/tmp/lutcalc-option-catalog'
URL = 'http://127.0.0.1:3000/'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    page = None
    for _ in range(100):
        try:
            page = next((item for item in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if item.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    socket = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
    request_id = 0

    def evaluate(expression):
        nonlocal_request = None
        global request_id
        request_id += 1
        socket.send(json.dumps({'id': request_id, 'method': 'Runtime.evaluate', 'params': {'expression': expression, 'returnByValue': True}}))
        while True:
            response = json.loads(socket.recv())
            if response.get('id') == request_id:
                return response['result']['result'].get('value')

    request_id += 1
    socket.send(json.dumps({'id': request_id, 'method': 'Page.navigate', 'params': {'url': URL}}))
    while True:
        response = json.loads(socket.recv())
        if response.get('id') == request_id:
            break
    time.sleep(7)
    evaluate("document.querySelector('.adjustment-lut-item .adjustment-item-main')?.click(); true")
    time.sleep(.5)
    report = evaluate("""(() => {
      const nativeSelects = [...document.querySelectorAll('.lut-analysis-panel select')];
      const engineSelects = [...(document.querySelector('iframe')?.contentDocument?.querySelectorAll('#box-twk select') || [])];
      const visibleGamma = nativeSelects[0] ? [...nativeSelects[0].options].map(x => x.textContent?.trim()) : [];
      const visibleGamut = nativeSelects[1] ? [...nativeSelects[1].options].map(x => x.textContent?.trim()) : [];
      const engineGamma = engineSelects[20] ? [...engineSelects[20].options].map(x => x.textContent?.trim()) : [];
      const engineGamut = engineSelects[22] ? [...engineSelects[22].options].map(x => x.textContent?.trim()) : [];
      return {
        visibleGammaCount: visibleGamma.length,
        engineGammaCount: engineGamma.length,
        visibleGamutCount: visibleGamut.length,
        engineGamutCount: engineGamut.length,
        gammaMatch: JSON.stringify(visibleGamma) === JSON.stringify(engineGamma),
        gamutMatch: JSON.stringify(visibleGamut) === JSON.stringify(engineGamut),
        gammaFirst: visibleGamma.slice(0, 6),
        gammaLast: visibleGamma.slice(-6),
      };
    })()""")
    report['ok'] = report['gammaMatch'] and report['gamutMatch'] and report['visibleGammaCount'] > 20
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try:
        socket.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
