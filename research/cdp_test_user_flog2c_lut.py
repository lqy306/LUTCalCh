import json
import subprocess
import time

import requests
import websocket

PORT = 9240
PROFILE = '/tmp/lutcalc-user-flog2c'
URL = 'http://127.0.0.1:3000/'
LUT_PATH = '/home/ubuntu/upload/pasted_file_zZOQb1_FLog2C_to_CLASSIC-Neg._65grid_V.1.00.cube'

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--remote-allow-origins=*', f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
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
    socket = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
    request_id = 0

    def cdp(method, params=None):
        global request_id
        request_id += 1
        socket.send(json.dumps({'id': request_id, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(socket.recv())
            if response.get('id') == request_id:
                return response

    def evaluate(expression):
        result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
        return result.get('result', {}).get('result', {}).get('value')

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('DOM.enable')
    cdp('Page.navigate', {'url': URL})
    time.sleep(8)

    evaluate("document.querySelector('.adjustment-lut-item .adjustment-item-main')?.click(); true")
    time.sleep(.6)
    before = evaluate("(() => ({ preview:document.querySelector('.preview-surface img')?.src || '', gamma:[...document.querySelectorAll('.lut-analysis-panel select')][0]?.value || '', gamut:[...document.querySelectorAll('.lut-analysis-panel select')][1]?.value || '' }))()") or {}
    choice = evaluate("""(() => {
      const selects = [...document.querySelectorAll('.lut-analysis-panel select')];
      const choose = (el, expected) => {
        const option = [...el.options].find(x => x.textContent?.trim() === expected);
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
        setter?.call(el, option.value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      return {
        gammaFLog2: choose(selects[0], 'F-Log2'),
        gamutFLog: choose(selects[1], 'Fujifilm F-Log Gamut'),
        gamma: selects[0]?.value || '', gamut: selects[1]?.value || ''
      };
    })()""") or {}
    time.sleep(.5)
    engine_selection = evaluate("""(() => {
      const frame = document.querySelector('iframe');
      const d = frame?.contentDocument;
      const w = frame?.contentWindow;
      const selects = [...(d?.querySelectorAll('#box-twk select') || [])];
      const setByText = (el, text) => {
        const option = [...el.options].find(x => x.textContent?.trim() === text);
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
        setter?.call(el, option.value);
        el.dispatchEvent(new w.Event('input', { bubbles: true }));
        el.dispatchEvent(new w.Event('change', { bubbles: true }));
        return true;
      };
      return {
        gammaFLog2: setByText(selects[20], 'F-Log2'),
        gamutFLog: setByText(selects[22], 'Fujifilm F-Log Gamut'),
        gamma: selects[20]?.options[selects[20]?.selectedIndex]?.textContent?.trim() || '',
        gamut: selects[22]?.options[selects[22]?.selectedIndex]?.textContent?.trim() || ''
      };
    })()""") or {}
    time.sleep(.5)

    document = cdp('DOM.getDocument', {'depth': 2})
    root_id = document['result']['root']['nodeId']
    node = cdp('DOM.querySelector', {'nodeId': root_id, 'selector': '.lut-analysis-panel input[type=file]'})
    input_id = node.get('result', {}).get('nodeId')
    if not input_id:
        raise RuntimeError('未找到原生 LUT 文件输入')
    cdp('DOM.setFileInputFiles', {'nodeId': input_id, 'files': [LUT_PATH]})
    time.sleep(7)
    title_box = evaluate("""(() => {
      const input=document.querySelector('.lut-analysis-panel input[type=text]');
      if(!input) return null;
      const box=input.getBoundingClientRect();
      return {x:box.left + Math.min(24, box.width / 2), y:box.top + box.height / 2};
    })()""")
    expected_title = 'Fujifilm_Classic_Neg_Rec709_Base'
    if title_box:
        cdp('Input.dispatchMouseEvent', {'type': 'mousePressed', 'x': title_box['x'], 'y': title_box['y'], 'button': 'left', 'clickCount': 1})
        cdp('Input.dispatchMouseEvent', {'type': 'mouseReleased', 'x': title_box['x'], 'y': title_box['y'], 'button': 'left', 'clickCount': 1})
        cdp('Input.dispatchKeyEvent', {'type': 'keyDown', 'key': 'a', 'code': 'KeyA', 'windowsVirtualKeyCode': 65, 'modifiers': 2})
        cdp('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'a', 'code': 'KeyA', 'windowsVirtualKeyCode': 65, 'modifiers': 2})
        cdp('Input.insertText', {'text': expected_title})
        time.sleep(.8)
    uploaded = evaluate("(() => ({ name:document.querySelector('.lut-file-status')?.textContent?.trim() || '', title:document.querySelector('.lut-analysis-panel input[type=text]')?.value || '', ready:!document.querySelector('.lut-analyst-actions .is-primary')?.disabled, compatibility:document.querySelector('.lut-analyst-compatibility')?.textContent?.trim() || '', compatibilityClass:document.querySelector('.lut-analyst-compatibility')?.className || '' }))()") or {}
    if uploaded.get('ready'):
        evaluate("document.querySelector('.lut-analyst-actions .is-primary')?.click(); true")
        time.sleep(8)
    after = evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      const gam=[...(d?.querySelectorAll('#box-gam select') || [])];
      const dynamic=gam.flatMap(x=>[...x.options].map(o=>o.textContent?.trim() || '')).filter(x=>/^(LA|Custom)\s*-/.test(x));
      const engineGamma=[...(d?.querySelectorAll('#box-twk select') || [])][20]?.options;
      const selectedGamma=engineGamma ? engineGamma[engineGamma.selectedIndex]?.textContent?.trim() : '';
      return {
        status:document.querySelector('.lut-file-status')?.textContent?.trim() || '',
        message:document.querySelector('.apple-status')?.textContent?.trim() || '',
        curveLength:(document.querySelector('.preview-surface img')?.src || '').length,
        dynamic,
        selectedGamma
      };
    })()""") or {}
    title_nodes = evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      return [...(d?.querySelectorAll('#box-twk input[type=text]') || [])].map((x, index) => ({
        index,
        value:x.value,
        parent:(x.parentElement?.textContent || '').trim().slice(0,180),
        ancestor:(x.parentElement?.parentElement?.textContent || '').trim().slice(0,280)
      }));
    })()""") or []
    pairing = evaluate("""(() => {
      const frame=document.querySelector('iframe');
      const d=frame?.contentDocument;
      const w=frame?.contentWindow;
      const gam=[...(d?.querySelectorAll('#box-gam select') || [])];
      const dynamic=gam.flatMap(x=>[...x.options].map(o=>o.textContent?.trim() || '')).find(x=>x.startsWith('LA - '));
      const setLA=(select)=>{
        const option=[...select.options].find(x=>x.textContent?.trim()===dynamic);
        if(!option) return false;
        const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(select),'value')?.set;
        setter?.call(select,option.value);
        select.dispatchEvent(new w.Event('input',{bubbles:true}));
        select.dispatchEvent(new w.Event('change',{bubbles:true}));
        return true;
      };
      return { dynamic, gamma:setLA(gam[7]), gamut:setLA(gam[11]) };
    })()""") or {}
    time.sleep(1.2)
    paired = evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      const gam=[...(d?.querySelectorAll('#box-gam select') || [])];
      const analyst=[...(d?.querySelectorAll('#box-twk select') || [])];
      const visible=[...document.querySelectorAll('.lut-analysis-panel select')];
      return {
        outputGamma:gam[7]?.options[gam[7]?.selectedIndex]?.textContent?.trim() || '',
        outputGamut:gam[11]?.options[gam[11]?.selectedIndex]?.textContent?.trim() || '',
        analystGamma:analyst[20]?.options[analyst[20]?.selectedIndex]?.textContent?.trim() || '',
        analystGamut:analyst[22]?.options[analyst[22]?.selectedIndex]?.textContent?.trim() || '',
        visibleGamma:visible[0]?.value || '',
        visibleGamut:visible[1]?.value || '',
        curveLength:(document.querySelector('.preview-surface img')?.src || '').length
      };
    })()""") or {}
    report = {'source': {'gamma': 'F-Log2C', 'gamut': 'F-GamutC', 'grid': 65}, 'expectedTitle': expected_title, 'nativeSelection': choice, 'engineSelection': engine_selection, 'uploaded': uploaded, 'after': {**after, 'curveChanged': after.get('curveLength', 0) > 0 and after.get('curveLength', 0) != len(before.get('preview', ''))}, 'titleNodes': title_nodes, 'pairing': pairing, 'paired': paired}
    expected_la = f'LA - {expected_title}'
    report['ok'] = uploaded.get('ready') and uploaded.get('title') == expected_title and paired.get('analystGamma') == 'Fujifilm F-Log2' and paired.get('analystGamut') == 'Fujifilm F-Log Gamut' and after.get('curveLength', 0) > 0 and pairing.get('gamma') and pairing.get('gamut') and paired.get('outputGamma', '').startswith(expected_la) and paired.get('outputGamut', '').startswith(expected_la)
    print(json.dumps(report, ensure_ascii=False, indent=2))
finally:
    try:
        socket.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
