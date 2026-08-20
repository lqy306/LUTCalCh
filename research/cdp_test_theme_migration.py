import json
import subprocess
import time

import requests
import websocket


PORT = 9251
URL = 'http://127.0.0.1:3000/'
PROFILE = '/tmp/lutcalc-theme-migration'
LEGACY_THEME_IDS = ('leica', 'lumix')


def inspect_legacy_theme(theme_id: str) -> dict:
    chrome = subprocess.Popen([
        'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
        f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}-{theme_id}', 'about:blank'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ws = None
    try:
        page = None
        for _ in range(100):
            try:
                page = next((item for item in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if item.get('type') == 'page'), None)
                if page:
                    break
            except Exception:
                pass
            time.sleep(.1)
        if not page:
            raise RuntimeError('Chromium 调试页面不可用')
        ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
        request_id = 0

        def call(method, params=None):
            nonlocal request_id
            request_id += 1
            ws.send(json.dumps({'id': request_id, 'method': method, 'params': params or {}}))
            while True:
                response = json.loads(ws.recv())
                if response.get('id') == request_id:
                    if 'error' in response:
                        raise RuntimeError(response['error'])
                    return response.get('result', {})

        call('Page.enable')
        call('Runtime.enable')
        call('Page.addScriptToEvaluateOnNewDocument', {'source': f"localStorage.setItem('lutcalc-workbench-theme','{theme_id}'); localStorage.setItem('lutcalc-workbench-mode','dark');"})
        call('Page.navigate', {'url': URL})
        time.sleep(5)
        expression = """(() => ({
          stored: localStorage.getItem('lutcalc-workbench-theme'),
          selected: document.querySelector('.theme-controls select')?.value || '',
          options: [...(document.querySelector('.theme-controls select')?.options || [])].map(option => option.value),
          dataset: document.documentElement.dataset.workbenchTheme || ''
        }))()"""
        result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
        return result['result'].get('value', {})
    finally:
        if ws:
            ws.close()
        chrome.terminate()
        chrome.wait(timeout=5)


checks = {theme_id: inspect_legacy_theme(theme_id) for theme_id in LEGACY_THEME_IDS}
allowed = {'ubuntu', 'kde', 'macos', 'omarchy'}
passed = all(check.get('stored') == 'ubuntu' and check.get('selected') == 'ubuntu' and check.get('dataset') == 'ubuntu' and set(check.get('options', [])) == allowed for check in checks.values())
print(json.dumps({'checks': checks, 'passed': passed}, ensure_ascii=False, indent=2))
