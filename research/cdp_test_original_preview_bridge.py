import json
import subprocess
import time

import requests
import websocket

PORT = 9243
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}','--user-data-dir=/tmp/lutpreview-bridge','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(80):
        try:
            page = next((item for item in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if item.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
    index = 0
    def evaluate(expression):
        nonlocal_index = None
        global index
        index += 1
        ws.send(json.dumps({'id':index,'method':'Runtime.evaluate','params':{'expression':expression,'returnByValue':True}}))
        while True:
            response = json.loads(ws.recv())
            if response.get('id') == index:
                return response['result']['result'].get('value')
    index += 1
    ws.send(json.dumps({'id':index,'method':'Page.navigate','params':{'url':'http://127.0.0.1:3000/'}}))
    while True:
        response = json.loads(ws.recv())
        if response.get('id') == index:
            break
    time.sleep(8)
    before = evaluate("(() => ({visible:!!document.querySelector('.engine-preview-surface'), preview:document.querySelector('.engine-preview-surface img')?.src.length || 0}))()") or {}
    evaluate("[...document.querySelectorAll('.preview-tool-bar button')].find(x=>x.textContent?.includes('显示预览'))?.click(); true")
    time.sleep(4)
    shown = evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      return {
        pagePreview:document.querySelector('.engine-preview-surface img')?.src.length || 0,
        iframePreview:(d?.querySelector('#can-preview')?.toDataURL() || '').length,
        previewClass:d?.querySelector('#preview-box')?.className || ''
      };
    })()""") or {}
    evaluate("[...document.querySelectorAll('.preview-tool-options label')].find(x=>x.textContent?.includes('WFM'))?.querySelector('input')?.click(); true")
    time.sleep(3)
    scope = evaluate("""(() => ({
      pageWaveform:document.querySelector('.engine-scope-grid img')?.src.length || 0,
      waveformVisible:!!document.querySelector('iframe')?.contentDocument?.querySelector('#can-waveform:not(.can-hide)')
    }))()""") or {}
    report = {'before':before,'shown':shown,'scope':scope}
    report['ok'] = shown.get('pagePreview',0) > 1000 and shown.get('iframePreview',0) > 1000 and scope.get('pageWaveform',0) > 1000
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
