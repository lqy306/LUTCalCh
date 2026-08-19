import json
import os
import subprocess
import time

import requests
import websocket


PORT = 9248
URL = 'http://127.0.0.1:3000/'
LUT_PATH = '/home/ubuntu/upload/pasted_file_zZOQb1_FLog2C_to_CLASSIC-Neg._65grid_V.1.00.cube'
PROFILE = '/tmp/lutcalc-classic-neg-regression'


chrome = subprocess.Popen([
    'chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-allow-origins=*',
    f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ws = None


try:
    if not os.path.exists(LUT_PATH):
        raise FileNotFoundError(LUT_PATH)

    page = None
    for _ in range(100):
        try:
            page = next((item for item in requests.get(f'http://127.0.0.1:{PORT}/json', timeout=1).json() if item.get('type') == 'page'), None)
            if page:
                break
        except Exception:
            pass
        time.sleep(.2)
    if not page:
        raise RuntimeError('无法连接 Chromium 调试页面')

    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
    request_id = 0

    def call(method, params=None):
        nonlocal_request_id = None
        global request_id
        request_id += 1
        ws.send(json.dumps({'id': request_id, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(ws.recv())
            if response.get('id') == request_id:
                if 'error' in response:
                    raise RuntimeError(f'{method}: {response["error"]}')
                return response.get('result', {})

    def evaluate(expression):
        result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
        return result.get('result', {}).get('value')

    call('Page.enable')
    call('Runtime.enable')
    call('DOM.enable')
    call('Page.navigate', {'url': URL})
    time.sleep(7)

    evaluate("document.querySelector('.adjustment-lut-trigger')?.click(); true")
    time.sleep(.5)

    root = call('DOM.getDocument', {'depth': 2, 'pierce': True})['root']
    # 必须走用户可见输入框，才能同时触发 React 文件名/兼容性状态和隐藏引擎的文件桥接。
    input_id = call('DOM.querySelector', {'nodeId': root['nodeId'], 'selector': '.lut-analysis-panel input[type=file]'})['nodeId']
    if not input_id:
        raise RuntimeError('工作台 LUTAnalyst 文件输入未找到')
    call('DOM.setFileInputFiles', {'nodeId': input_id, 'files': [LUT_PATH]})
    time.sleep(2)

    selection = evaluate("""(() => {
      const panel = document.querySelector('.lut-analysis-panel');
      const selects = [...(panel?.querySelectorAll('select') || [])];
      const setByText = (node, label) => {
        const option = [...node.options].find(item => item.textContent.trim() === label);
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(node, option.value);
        node.dispatchEvent(new Event('input', {bubbles: true}));
        node.dispatchEvent(new Event('change', {bubbles: true}));
        return true;
      };
      return {
        gamma: setByText(selects[0], 'Fujifilm F-Log2'),
        gamut: setByText(selects[1], 'Fujifilm F-Log Gamut'),
        selected: selects.map(node => node.options[node.selectedIndex]?.textContent.trim() || '')
      };
    })()""")
    time.sleep(.5)

    before = evaluate("""(() => {
      const frame = document.querySelector('iframe');
      const d = frame?.contentDocument;
      const gam = [...(d?.querySelectorAll('#box-gam select') || [])];
      const canvas = d?.querySelector('#can-stop-out');
      return {
        outputGamma: gam[7]?.options[gam[7]?.selectedIndex]?.textContent.trim() || '',
        outputGamut: gam[11]?.options[gam[11]?.selectedIndex]?.textContent.trim() || '',
        curve: canvas?.toDataURL('image/png')?.slice(-128) || '',
        status: document.querySelector('.workbench-status')?.textContent?.trim() || ''
      };
    })()""")

    evaluate("[...document.querySelectorAll('.lut-analyst-actions .is-primary')].find(node => /分析 LUT/.test(node.textContent || ''))?.click(); true")

    samples = []
    for elapsed in range(1, 31):
        time.sleep(1)
        state = evaluate("""(() => {
          const frame = document.querySelector('iframe');
          const d = frame?.contentDocument;
          const gam = [...(d?.querySelectorAll('#box-gam select') || [])];
          const twk = [...(d?.querySelectorAll('#box-twk .tweakholder') || [])].find(node => /^LUTAnalyst/.test(node.firstChild?.textContent?.trim() || ''));
          const button = twk?.querySelector('input[type=button][value], button');
          const canvas = d?.querySelector('#can-stop-out');
          const main = document.querySelector('.apple-app-shell');
          const analyst = frame?.contentWindow?.lutInputs?.lutAnalyst;
          const transfer = analyst?.getL?.();
          const transferValues = transfer && Object.prototype.toString.call(transfer) === '[object ArrayBuffer]' ? new Float64Array(transfer) : transfer;
          return {
            elapsed: %d,
            outputGamma: gam[7]?.options[gam[7]?.selectedIndex]?.textContent.trim() || '',
            outputGamut: gam[11]?.options[gam[11]?.selectedIndex]?.textContent.trim() || '',
            gammaOptions: gam[7] ? [...gam[7].options].slice(-2).map(item => item.textContent.trim()) : [],
            gamutOptions: gam[11] ? [...gam[11].options].slice(-2).map(item => item.textContent.trim()) : [],
            analysisButton: button?.value || button?.textContent?.trim() || '',
            curve: canvas?.toDataURL('image/png')?.slice(-128) || '',
            status: main?.querySelector('.apple-status')?.textContent?.trim() || '',
            visibleAnalysis: main?.querySelector('.lut-analysis-context')?.textContent?.trim() || '',
            visibleMetadata: main?.querySelector('.lut-analyst-metadata')?.textContent?.trim() || '',
            visibleSummary: main?.querySelector('.lut-analysis-result')?.textContent?.trim() || '',
            analystKeys: analyst ? Object.keys(analyst).sort() : [],
            transferProbe: transferValues ? { type: transfer.constructor?.name || '', length: transferValues.length || 0, first: transferValues[0] || 0, middle: transferValues[Math.floor((transferValues.length || 1) / 2)] || 0, last: transferValues[(transferValues.length || 1) - 1] || 0 } : null
          };
        })()""" % elapsed)
        samples.append(state)
        if state and state.get('outputGamma', '').startswith('LA - ') and state.get('outputGamut', '').startswith('LA - ') and state.get('curve') != before.get('curve') and '当前输出使用外部 LUT 分析结果' in state.get('visibleAnalysis', ''):
            break

    final = samples[-1] if samples else {}
    result = {
        'selection': selection,
        'before': before,
        'final': final,
        'samples': samples,
        'passed': bool(final and final.get('outputGamma', '').startswith('LA - ') and final.get('outputGamut', '').startswith('LA - ') and final.get('curve') != before.get('curve') and '当前输出使用外部 LUT 分析结果' in final.get('visibleAnalysis', '') and 'F-Log2C' in final.get('visibleMetadata', '') and 'F-GamutC' in final.get('visibleMetadata', '') and 'SHA-256' in final.get('visibleMetadata', '') and '分析参数' in final.get('visibleSummary', ''))
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    if ws:
        ws.close()
    chrome.terminate()
    chrome.wait(timeout=5)
