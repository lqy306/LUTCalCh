import json
import subprocess
import time

import requests
import websocket

PORT = 9239
PROFILE = '/tmp/lutcalc-image-preview-tool'
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
    evaluate("""(() => {
      const input = document.querySelector('.preview-card input[type=file]');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#e95420"/><text x="20" y="95" font-size="30" fill="white">LUT Preview</text></svg>';
      const file = new File([svg], 'preview-test.svg', { type: 'image/svg+xml' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()""")
    time.sleep(.7)
    loaded = evaluate("""(() => ({
      image: !!document.querySelector('.image-preview-surface img[src^="data:"]'),
      large: document.querySelector('.image-preview-surface')?.classList.contains('is-large'),
      visible: !!document.querySelector('.image-preview-surface')
    }))()""")
    evaluate("[...document.querySelectorAll('.preview-tool-bar button')].find(x => x.textContent?.includes('大图'))?.click(); [...document.querySelectorAll('.preview-tool-bar button')].find(x => x.textContent?.includes('隐藏预览'))?.click(); true")
    time.sleep(.3)
    toggled = evaluate("""(() => ({
      visible: !!document.querySelector('.image-preview-surface'),
      hideLabel: [...document.querySelectorAll('.preview-tool-bar button')].some(x => x.textContent?.includes('显示预览'))
    }))()""")
    report = {'loaded': loaded, 'toggled': toggled}
    report['ok'] = loaded.get('image') and loaded.get('large') and loaded.get('visible') and not toggled.get('visible') and toggled.get('hideLabel')
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try:
        socket.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
