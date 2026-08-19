import json
import subprocess
import time

import requests
import websocket

PORT = 9238
PROFILE = '/tmp/lutcalc-output-bridge'
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
      const click = (selector, index = 0) => document.querySelectorAll(selector)[index]?.click();
      click('input[name="output-dimension-mode"]', 0);
      setTimeout(() => {
        click('input[name="output-dimension"]', 1);
        click('input[name="output-input-range"]', 0);
        click('input[name="output-output-range"]', 0);
        click('input[name="output-usage"]', 1);
        document.querySelector('.output-clip-legal input')?.click();
      }, 80);
      return true;
    })()""")
    time.sleep(1.2)
    report = evaluate("""(() => {
      const d = document.querySelector('iframe')?.contentDocument;
      const box = d?.querySelector('#box-lut');
      const checked = (name) => [...(box?.querySelectorAll(`input[type=radio][name="${name}"]`) || [])].findIndex(x => x.checked);
      const dimension = [...(box?.querySelectorAll('input[type=radio][name="dimension"]') || [])].find(x => x.checked)?.value || '';
      const clip = [...(box?.querySelectorAll('input[type=checkbox]') || [])].find(x => /0%-100%/.test((x.parentElement?.textContent || '').replace(/\s/g,'')))?.checked;
      const radioGroups = [...(box?.querySelectorAll('input[type=radio]') || [])].map(x => ({ name: x.name, value: x.value, checked: x.checked })).filter(x => ['dims','dimension','inrange','outrange','lutusage'].includes(x.name));
      return { dims: checked('dims'), dimension, inrange: checked('inrange'), outrange: checked('outrange'), usage: checked('lutusage'), clip, radioGroups };
    })()""")
    report['ok'] = report['dims'] == 0 and report['dimension'] == '4096' and report['inrange'] == 0 and report['outrange'] == 0 and report['usage'] == 1 and report['clip'] is False
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try:
        socket.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
