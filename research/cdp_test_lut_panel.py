import json
import subprocess
import time
import requests
import websocket

PORT = 9231
PROFILE = '/tmp/lutcalc-cdp-lut-panel'
URL = 'http://127.0.0.1:3000/'
SAMPLE = '/tmp/lutcalc-fuji-test/smoke.cube'
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
            if result.get('id') == ident: return result
    def evaluate(expression):
        result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
        return result['result']['result'].get('value')
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('DOM.enable'); cdp('Page.navigate', {'url': URL}); time.sleep(7)
    evaluate("document.querySelector('.adjustment-lut-item .adjustment-item-main')?.click(); true")
    time.sleep(.5)
    root_id = cdp('DOM.getDocument', {'depth': 0})['result']['root']['nodeId']
    node_id = cdp('DOM.querySelector', {'nodeId': root_id, 'selector': '.adjustment-lut-item input[type=file]'})['result']['nodeId']
    set_result = cdp('DOM.setFileInputFiles', {'nodeId': node_id, 'files': [SAMPLE]})
    native_before_change = evaluate("(() => { const input=document.querySelector('.adjustment-lut-item input[type=file]'); return {count:input?.files?.length || 0,name:input?.files?.[0]?.name || ''}; })()")
    evaluate("(() => { const input=document.querySelector('.adjustment-lut-item input[type=file]'); input?.dispatchEvent(new Event('input',{bubbles:true})); input?.dispatchEvent(new Event('change',{bubbles:true})); return true; })()")
    time.sleep(1)
    uploaded = evaluate("({status:document.querySelector('.lut-file-status')?.textContent.trim(), nativeFile:document.querySelector('.adjustment-lut-item input[type=file]')?.files?.[0]?.name || '', iframeFile:document.querySelector('iframe')?.contentDocument?.querySelector('input[type=file]')?.files?.[0]?.name || ''})")
    evaluate("[...document.querySelectorAll('.adjustment-lut-item button')].find(b=>b.textContent.includes('分析'))?.click(); true")
    time.sleep(2)
    analyzed = evaluate("({status:document.querySelector('.lut-file-status')?.textContent.trim(), preview:!!document.querySelector('img[alt*=曲线]'), engineTitle:[...document.querySelectorAll('input')].map(i=>i.value).find(v=>v.includes('smoke')) || ''})")
    print(json.dumps({'setResult':set_result,'nativeBeforeChange':native_before_change,'uploaded':uploaded,'analyzed':analyzed}, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
