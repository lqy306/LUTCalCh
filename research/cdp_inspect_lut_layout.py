import json
import subprocess
import time
import requests
import websocket

PORT=9232
PROFILE='/tmp/lutcalc-cdp-lut-layout'
URL='http://127.0.0.1:3000/'
chrome=subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}',f'--user-data-dir={PROFILE}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    for _ in range(80):
        try:
            page=next(x for x in requests.get(f'http://127.0.0.1:{PORT}/json',timeout=1).json() if x.get('type')=='page'); break
        except Exception: time.sleep(.2)
    ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=15); ident=0
    def cdp(method,params=None):
        global ident; ident+=1; ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            result=json.loads(ws.recv())
            if result.get('id')==ident: return result
    def evaluate(expression):
        return cdp('Runtime.evaluate',{'expression':expression,'returnByValue':True})['result']['result'].get('value')
    cdp('Page.enable'); cdp('Runtime.enable'); cdp('Page.navigate',{'url':URL}); time.sleep(7)
    result=evaluate('''(() => { const item=document.querySelector('.adjustment-lut-item'); const button=item?.querySelector('.adjustment-item-main'); const name=item?.querySelector('.adjustment-item-name'); const summary=item?.querySelector('.adjustment-item-summary'); const r=e=>e?{text:e.textContent.trim(),rect:(()=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,w:x.width,h:x.height}})(),display:getComputedStyle(e).display,whiteSpace:getComputedStyle(e).whiteSpace,writingMode:getComputedStyle(e).writingMode,overflow:getComputedStyle(e).overflow,grid:getComputedStyle(e).gridTemplateColumns}:null; return {viewport:{w:innerWidth,h:innerHeight},item:r(item),button:r(button),name:r(name),summary:r(summary),shell:document.querySelector('.apple-app-shell')?.getBoundingClientRect().width}; })()''')
    print(json.dumps(result,ensure_ascii=False,indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
