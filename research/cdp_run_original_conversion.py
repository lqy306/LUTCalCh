import json
import os
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9224
PROFILE = '/tmp/lutcalc-cdp-original'
URL = 'http://127.0.0.1:3000/lutcalc/index.html'
SAMPLE = '/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/gfx-eterna-55/FLog_to_ETERNA_33grid_V.1.00.cube'
DOWNLOAD = '/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/original-output'
Path(DOWNLOAD).mkdir(parents=True, exist_ok=True)

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}',
    'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    for _ in range(80):
        try:
            targets = requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json()
            page = next(item for item in targets if item.get('type') == 'page')
            break
        except Exception:
            time.sleep(0.2)
    else:
        raise RuntimeError('Chrome DevTools target did not start')

    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=15)
    counter = 0

    def cdp(method, params=None):
        nonlocal_counter = None
        global counter
        counter += 1
        ws.send(json.dumps({'id': counter, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(ws.recv())
            if response.get('id') == counter:
                return response

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('DOM.enable')
    cdp('Browser.setDownloadBehavior', {'behavior': 'allow', 'downloadPath': DOWNLOAD})
    cdp('Page.navigate', {'url': URL})
    time.sleep(5)

    def evaluate(expression):
        result = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
        if 'exceptionDetails' in result.get('result', {}):
            raise RuntimeError(result['result']['exceptionDetails'])
        return result['result']['result'].get('value')

    # 通过 DOM.setFileInputFiles 真实注入 LUT 文件，而不是伪造文本状态。
    root = cdp('DOM.getDocument', {'depth': -1})['result']['root']['nodeId']
    node = cdp('DOM.querySelector', {'nodeId': root, 'selector': 'input[type=file]:nth-of-type(3)'})
    if not node.get('result', {}).get('nodeId'):
        # nth-of-type 在不同 DOM 结构下不稳定，按父文本定位 LUTAnalyst 输入。
        node = cdp('DOM.querySelectorAll', {'nodeId': root, 'selector': 'input[type=file]'})
        nodes = node['result']['nodeIds']
        if len(nodes) < 3:
            raise RuntimeError(f'Expected three file inputs, got {len(nodes)}')
        node_id = nodes[2]
    else:
        node_id = node['result']['nodeId']
    cdp('DOM.setFileInputFiles', {'nodeId': node_id, 'files': [SAMPLE]})
    time.sleep(1)

    state = evaluate('''(() => {
      const selects = [...document.querySelectorAll('select')];
      const setText = (select, text) => {
        const option = [...select.options].find(o => o.textContent.trim() === text) || [...select.options].find(o => o.textContent.trim().startsWith(text));
        if (!option) return false;
        select.value = option.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        return true;
      };
      const recordGammaMakerSet = setText(selects[9], 'Fujifilm');
      const recordGamutMakerSet = setText(selects[13], 'Fujifilm');
      const recordGammaSet = setText(selects[10], 'Fujifilm F-Log');
      const recordGamutSet = setText(selects[14], 'Fujifilm F-Log Gamut');
      const outputGammaSet = setText(selects[16], 'Rec709 (800%)') || setText(selects[16], 'Rec709 - γ1.90 (exp2.22)');
      const outputGamutSet = setText(selects[20], 'Rec709');
      const analystGamma = selects.find(s => [...s.options].some(o => /Fujifilm F-Log$/.test(o.textContent.trim())));
      const fujiFLog = analystGamma && [...analystGamma.options].find(o => /Fujifilm F-Log$/.test(o.textContent.trim()));
      if (fujiFLog) { analystGamma.value = fujiFLog.value; analystGamma.dispatchEvent(new Event('change', {bubbles:true})); }
      const buttons = [...document.querySelectorAll('input[type=button],button')];
      const analyse = buttons.find(b => /Analyse|分析/i.test(b.value || b.textContent));
      if (!analyse) throw new Error('Analyse button not found');
      analyse.click();
      return {recordGammaMakerSet, recordGamutMakerSet, recordGammaSet, recordGamutSet, outputGammaSet, outputGamutSet, inputGamma: analystGamma?.value, inputGammaLabel: analystGamma?.selectedOptions?.[0]?.textContent, analyse: analyse.value || analyse.textContent};
    })()''')
    time.sleep(5)

    after_analysis = evaluate('''(() => {
      const selects = [...document.querySelectorAll('select')];
      const setText = (select, text) => {
        const option = [...select.options].find(o => o.textContent.trim() === text) || [...select.options].find(o => o.textContent.trim().startsWith(text));
        if (!option) return false;
        select.value = option.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        return true;
      };
      const outputGammaSet = setText(selects[16], 'Rec709 (800%)') || setText(selects[16], 'Rec709 - γ1.90 (exp2.22)');
      const outputGamutSet = setText(selects[20], 'Rec709');
      return {
      outputGammaSet,
      outputGamutSet,
      title: [...document.querySelectorAll('input')].find(e => e.value && /Rec709-Fujifilm|Fujifilm|3513/i.test(e.value))?.value || '',
      curve: !!document.querySelector('canvas'),
      outputGamma: [...document.querySelectorAll('select')].map(s => s.selectedOptions?.[0]?.textContent).filter(Boolean).filter(x => /Rec709/i.test(x)).slice(-5),
      analystText: document.querySelector('#box-twk')?.innerText?.slice(-1500) || ''
      };
    })()''')

    result = evaluate('''(() => {
      const buttons = [...document.querySelectorAll('input[type=button],button')];
      const save = buttons.find(b => /生成 LUT|Generate LUT/i.test(b.value || b.textContent));
      if (!save) throw new Error('Generate LUT button not found');
      save.click();
      return {button: save.value || save.textContent};
    })()''')
    time.sleep(5)

    files = [str(p) for p in Path(DOWNLOAD).glob('*')]
    print(json.dumps({'loaded': state, 'afterAnalysis': after_analysis, 'generated': result, 'downloads': files}, ensure_ascii=False, indent=2))
finally:
    try:
        ws.close()
    except Exception:
        pass
    chrome.terminate()
    chrome.wait(timeout=5)
