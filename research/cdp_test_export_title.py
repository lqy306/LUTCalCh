import json
import shutil
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9242
PROFILE = '/tmp/lutcalc-export-title'
DOWNLOADS = Path('/tmp/lutcalc-export-downloads')
URL = 'http://127.0.0.1:3000/'
EXPECTED = 'Fujifilm_Classic_Neg_Rec709_Base'

shutil.rmtree(DOWNLOADS, ignore_errors=True)
DOWNLOADS.mkdir(parents=True, exist_ok=True)
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}',f'--user-data-dir={PROFILE}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    page = None
    for _ in range(100):
        try:
            page = next((x for x in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if x.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
    ident = 0
    def cdp(method, params=None):
        global ident
        ident += 1
        ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            result = json.loads(ws.recv())
            if result.get('id') == ident:
                return result
    def evaluate(expression):
        return cdp('Runtime.evaluate', {'expression':expression,'returnByValue':True})['result']['result'].get('value')
    cdp('Page.enable'); cdp('Runtime.enable')
    cdp('Browser.setDownloadBehavior', {'behavior':'allow','downloadPath':str(DOWNLOADS),'eventsEnabled':True})
    cdp('Page.navigate', {'url':URL}); time.sleep(7)
    title_box = evaluate("""(() => {
      const input=document.querySelector('.export-card input');
      if(!input) return null;
      const box=input.getBoundingClientRect();
      return {x:box.left+20,y:box.top+box.height/2};
    })()""")
    if title_box:
      cdp('Input.dispatchMouseEvent', {'type':'mousePressed','x':title_box['x'],'y':title_box['y'],'button':'left','clickCount':1})
      cdp('Input.dispatchMouseEvent', {'type':'mouseReleased','x':title_box['x'],'y':title_box['y'],'button':'left','clickCount':1})
      evaluate("document.querySelector('.export-card input')?.focus(); document.querySelector('.export-card input')?.select(); true")
      cdp('Input.dispatchKeyEvent', {'type':'keyDown','key':'a','code':'KeyA','windowsVirtualKeyCode':65,'modifiers':2})
      cdp('Input.dispatchKeyEvent', {'type':'keyUp','key':'a','code':'KeyA','windowsVirtualKeyCode':65,'modifiers':2})
      cdp('Input.insertText', {'text':EXPECTED})
    title_set = evaluate("document.querySelector('.export-card input')?.value || ''")
    time.sleep(.8)
    evaluate("[...document.querySelectorAll('.export-card .native-actions button')].find(x=>x.textContent?.includes('生成 LUT'))?.click(); true")
    for _ in range(50):
        files = [f for f in DOWNLOADS.iterdir() if f.suffix.lower() in ('.cube','.3dl','.lut')]
        if files:
            break
        time.sleep(.2)
    files = [f for f in DOWNLOADS.iterdir() if f.suffix.lower() in ('.cube','.3dl','.lut')]
    file = files[0] if files else None
    lines = file.read_text(errors='replace').splitlines()[:20] if file else []
    report = {'titleSet':title_set,'file':file.name if file else '', 'head':lines}
    report['ok'] = bool(file) and EXPECTED in file.name and any(EXPECTED in line for line in lines)
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
