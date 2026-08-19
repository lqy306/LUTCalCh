import json
import subprocess
import time

import requests
import websocket

PORT = 9236
PROFILE = '/tmp/lutcalc-test-lutanalyst-sync'
URL = 'http://127.0.0.1:3000/'
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}',f'--user-data-dir={PROFILE}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(100):
        try:
            page = next((x for x in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if x.get('type') == 'page'), None)
            if page: break
        except Exception: pass
        time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
    ident = 0
    def cdp(method, params=None):
        global ident
        ident += 1
        ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            result=json.loads(ws.recv())
            if result.get('id') == ident: return result
    def evaluate(expression):
        return cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})['result']['result'].get('value')
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Page.navigate', {'url': URL}); time.sleep(7)
    evaluate("document.querySelector('.adjustment-lut-item .adjustment-item-main')?.click(); true")
    time.sleep(.5)
    evaluate("(() => { const input=document.querySelector('.lut-analysis-panel input[type=file]'); if (!input) return false; const cube='TITLE \\\"同步回归\\\"\\nLUT_3D_SIZE 2\\nDOMAIN_MIN 0 0 0\\nDOMAIN_MAX 1 1 1\\n0 0 0\\n0 0 1\\n0 1 0\\n0 1 1\\n1 0 0\\n1 0 1\\n1 1 0\\n1 1 1\\n'; const file=new File([cube],'sync-test.cube',{type:'text/plain'}); const transfer=new DataTransfer(); transfer.items.add(file); Object.defineProperty(input,'files',{configurable:true,value:transfer.files}); input.dispatchEvent(new Event('change',{bubbles:true})); return true; })()")
    time.sleep(.8)
    result=evaluate("(() => { const gamma=[...document.querySelectorAll('.lut-analysis-panel select')][0]; const gamut=[...document.querySelectorAll('.lut-analysis-panel select')][1]; const set=(el, value) => { const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value')?.set; setter?.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }; if (!gamma || !gamut) return {error:'面板选择框未挂载'}; set(gamma,'S-Log2'); set(gamut,'Sony S-Gamut3'); return {visibleGamma:gamma.value, visibleGamut:gamut.value}; })()")
    immediate=evaluate("(() => { const d=document.querySelector('iframe')?.contentDocument; const selects=[...(d?.querySelectorAll('#box-twk select') || [])]; return {engineGamma:selects[20]?.value || '', engineGamut:selects[22]?.value || ''}; })()") or {}
    direct=evaluate("(() => { const d=document.querySelector('iframe')?.contentDocument; const w=document.querySelector('iframe')?.contentWindow; const selects=[...(d?.querySelectorAll('#box-twk select') || [])]; for (const [el,value] of [[selects[20],'1'],[selects[22],'2']]) { const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value')?.set; setter?.call(el,value); el.dispatchEvent(new w.Event('change',{bubbles:true})); } return {engineGamma:selects[20]?.value || '', engineGamut:selects[22]?.value || ''}; })()") or {}
    time.sleep(.8)
    synced=evaluate("(() => { const frame=document.querySelector('iframe'); const d=frame?.contentDocument; const selects=[...(d?.querySelectorAll('#box-twk select') || [])]; return {frame:!!frame, document:!!d, count:selects.length, engineGamma:selects[20]?.value || '', engineGamut:selects[22]?.value || '', gammaOptions:selects[20] ? [...selects[20].options].slice(0,8).map(x=>({text:x.textContent,value:x.value})) : [], gamutOptions:selects[22] ? [...selects[22].options].slice(0,8).map(x=>({text:x.textContent,value:x.value})) : []}; })()") or {}
    print(json.dumps({'visible':result or {},'immediate':immediate,'direct':direct,'synced':synced,'ok':(result or {}).get('visibleGamma')=='S-Log2' and (result or {}).get('visibleGamut')=='Sony S-Gamut3' and synced.get('engineGamma')=='1' and synced.get('engineGamut')=='2'}, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
