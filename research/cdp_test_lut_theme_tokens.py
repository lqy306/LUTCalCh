import json
import subprocess
import time

import requests
import websocket

PORT = 9244
chrome = subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--remote-allow-origins=*',f'--remote-debugging-port={PORT}','--user-data-dir=/tmp/lut-theme-token-test','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ws = None
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
    call_id = 0
    def evaluate(expression):
        nonlocal_call_id = None
        global call_id
        call_id += 1
        ws.send(json.dumps({'id':call_id,'method':'Runtime.evaluate','params':{'expression':expression,'returnByValue':True}}))
        while True:
            result = json.loads(ws.recv())
            if result.get('id') == call_id:
                return result['result']['result'].get('value')
    call_id += 1
    ws.send(json.dumps({'id':call_id,'method':'Page.navigate','params':{'url':'http://127.0.0.1:3000/'}}))
    while True:
        result = json.loads(ws.recv())
        if result.get('id') == call_id:
            break
    time.sleep(6)
    evaluate("[...document.querySelectorAll('.adjustment-lut-trigger')][0]?.click(); true")
    time.sleep(.3)
    themes = evaluate("[...document.querySelector('[aria-label=选择主题]').options].map(x=>x.value)") or []
    rows = []
    for theme in themes:
        evaluate(f"""(() => {{
          const node=document.querySelector('[aria-label=选择主题]');
          const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
          setter.call(node,{json.dumps(theme)});
          node.dispatchEvent(new Event('change',{{bubbles:true}}));
        }})()""")
        time.sleep(.25)
        rows.append(evaluate("""(() => {
          const root=document.querySelector('.apple-app-shell');
          const name=document.querySelector('.adjustment-lut-item.is-expanded .adjustment-item-name');
          const arrow=document.querySelector('.adjustment-lut-item.is-expanded .adjustment-chevron');
          const style=getComputedStyle(root);
          return {theme:document.querySelector('[aria-label=选择主题]').value, accent:style.getPropertyValue('--theme-accent').trim(), name:getComputedStyle(name).color, arrow:getComputedStyle(arrow).color};
        })()"""))
    evaluate("document.querySelector('.theme-mode-button')?.click(); true")
    time.sleep(.3)
    dark_rows = []
    for theme in themes:
        evaluate(f"""(() => {{
          const node=document.querySelector('[aria-label=选择主题]');
          const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
          setter.call(node,{json.dumps(theme)});
          node.dispatchEvent(new Event('change',{{bubbles:true}}));
        }})()""")
        time.sleep(.2)
        dark_rows.append(evaluate("""(() => {
          const root=document.querySelector('.apple-app-shell');
          const name=document.querySelector('.adjustment-lut-item.is-expanded .adjustment-item-name');
          const arrow=document.querySelector('.adjustment-lut-item.is-expanded .adjustment-chevron');
          const style=getComputedStyle(root);
          return {theme:document.querySelector('[aria-label=选择主题]').value, accent:style.getPropertyValue('--theme-accent').trim(), name:getComputedStyle(name).color, arrow:getComputedStyle(arrow).color};
        })()"""))
    print(json.dumps({'lightThemes': rows, 'darkThemes': dark_rows, 'lightVaries': len(set(row['name'] for row in rows)) > 1, 'darkVaries': len(set(row['name'] for row in dark_rows)) > 1, 'allMatch': all(row['name'] == row['arrow'] for row in rows + dark_rows)}, ensure_ascii=False, indent=2))
finally:
    if ws:
        ws.close()
    chrome.terminate(); chrome.wait(timeout=5)
