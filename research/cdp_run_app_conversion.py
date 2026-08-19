import json
import subprocess
import time
from pathlib import Path

import requests
import websocket

PORT = 9226
PROFILE = '/tmp/lutcalc-cdp-app-convert'
URL = 'https://lutcalcapp-s8bmtac7.manus.space/'
SAMPLE = '/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/gfx-eterna-55/FLog_to_ETERNA_33grid_V.1.00.cube'
DOWNLOAD = '/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/app-output'
Path(DOWNLOAD).mkdir(parents=True, exist_ok=True)

chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    for _ in range(80):
        try:
            targets = requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json()
            page = next(x for x in targets if x.get('type') == 'page')
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
            response = json.loads(ws.recv())
            if response.get('id') == ident:
                return response
    def evaluate(expression, await_promise=False):
        response = cdp('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': await_promise})
        if 'exceptionDetails' in response.get('result', {}):
            raise RuntimeError(response['result']['exceptionDetails'])
        return response['result']['result'].get('value')

    cdp('Page.enable'); cdp('Runtime.enable'); cdp('DOM.enable')
    cdp('Browser.setDownloadBehavior', {'behavior': 'allow', 'downloadPath': DOWNLOAD})
    cdp('Page.navigate', {'url': URL})
    time.sleep(8)

    # 获取同源 iframe 内第三个文件输入节点，并用 DevTools API 真实上传文件。
    object_response = cdp('Runtime.evaluate', {
        'expression': 'document.querySelector("iframe")?.contentDocument?.querySelectorAll("input[type=file]")[2]',
        'returnByValue': False,
    })
    object_id = object_response['result']['result'].get('objectId')
    if not object_id:
        raise RuntimeError('LUTAnalyst file input is not available')
    node_response = cdp('DOM.requestNode', {'objectId': object_id})
    node_id = node_response['result']['nodeId']
    cdp('DOM.setFileInputFiles', {'nodeId': node_id, 'files': [SAMPLE]})
    time.sleep(1)

    before = evaluate('''(async () => {
      const frame = document.querySelector('iframe');
      const fd = frame?.contentDocument;
      const setText = (select, text) => {
        const option = [...select.options].find(o => o.textContent.trim() === text);
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        setter?.call(select, option.value);
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
        return true;
      };
      const mainSelects = [...document.querySelectorAll('select')];
      const recordGammaMaker = mainSelects[3];
      const recordGamma = mainSelects[4];
      const recordGamutMaker = mainSelects[5];
      const recordGamut = mainSelects[6];
      const outGamma = mainSelects[8];
      const outGamut = mainSelects[10];
      const recordGammaMakerOk = setText(recordGammaMaker, 'Fujifilm');
      const recordGamutMakerOk = setText(recordGamutMaker, 'Fujifilm');
      await new Promise(resolve => setTimeout(resolve, 500));
      const recordGammaOk = setText(recordGamma, 'F-Log') || setText(recordGamma, 'Fujifilm F-Log');
      const recordGamutOk = setText(recordGamut, 'F-Log Gamut') || setText(recordGamut, 'Fujifilm F-Log Gamut');
      const gammaOk = setText(outGamma, 'Rec709 (800%)') || setText(outGamma, 'Rec709');
      const gamutOk = setText(outGamut, 'Rec709');
      const analystSelect = [...(fd?.querySelectorAll('select') || [])].find(s => [...s.options].some(o => /Fujifilm F-Log$/.test(o.textContent.trim())));
      const analystFLog = analystSelect && [...analystSelect.options].find(o => /Fujifilm F-Log$/.test(o.textContent.trim()));
      if (analystSelect && analystFLog) {
        analystSelect.value = analystFLog.value;
        analystSelect.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const analyse = [...(fd?.querySelectorAll('input[type=button],button') || [])].find(b => /分析|Analyse/i.test(b.value || b.textContent));
      if (!analyse) throw new Error('Native LUT analysis button not found');
      analyse.click();
      return {recordGammaMakerOk, recordGamutMakerOk, recordGammaOk, recordGamutOk, gammaOk, gamutOk, recordGammaMaker:recordGammaMaker?.selectedOptions?.[0]?.textContent, recordGamutMaker:recordGamutMaker?.selectedOptions?.[0]?.textContent, recordGamma:recordGamma?.selectedOptions?.[0]?.textContent, recordGamut:recordGamut?.selectedOptions?.[0]?.textContent, outGamma:outGamma?.selectedOptions?.[0]?.textContent, outGamut:outGamut?.selectedOptions?.[0]?.textContent, analystFLog:analystSelect?.selectedOptions?.[0]?.textContent, analyse:analyse.value || analyse.textContent};
    })()''', await_promise=True)
    time.sleep(7)

    after = evaluate('''(() => {
      const frame = document.querySelector('iframe');
      const fd = frame?.contentDocument;
      const selects = [...document.querySelectorAll('select')];
      const outputGamma = selects[8];
      const outputGamut = selects[10];
      const setText = (select, text) => {
        const option = [...select.options].find(o => o.textContent.trim() === text) || [...select.options].find(o => o.textContent.trim().startsWith(text));
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        setter?.call(select, option.value);
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
        return true;
      };
      const gammaSet = setText(outputGamma, 'Rec709 (800%)') || setText(outputGamma, 'Rec709');
      const gamutSet = setText(outputGamut, 'Rec709');
      const update = [...document.querySelectorAll('button')].find(b => /更新预览/.test(b.textContent));
      update?.click();
      return {
        output: [...document.querySelectorAll('select')].slice(7, 11).map(s => s.selectedOptions?.[0]?.textContent),
        gammaSet,
        gamutSet,
        title: [...document.querySelectorAll('input')].map(i => i.value).find(v => /FLog_to_ETERNA|ETERNA|Fujifilm/i.test(v)) || '',
        curve: !!document.querySelector('img[alt*="曲线"]'),
        analyst: fd?.querySelector('#box-twk')?.innerText?.slice(-900) || ''
      };
    })()''')

    generated = evaluate('''(() => {
      const button = [...document.querySelectorAll('button')].find(b => /生成 LUT/.test(b.textContent));
      if (!button) throw new Error('Native Generate LUT button not found');
      button.click();
      return button.textContent;
    })()''')
    time.sleep(7)
    files = [str(p) for p in Path(DOWNLOAD).glob('*')]
    print(json.dumps({'before': before, 'after': after, 'generated': generated, 'downloads': files}, ensure_ascii=False, indent=2))
finally:
    try: ws.close()
    except Exception: pass
    chrome.terminate(); chrome.wait(timeout=5)
