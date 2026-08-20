import json
import os
import subprocess
import time

import requests
import websocket


PORT = 9251
URL = 'http://127.0.0.1:3000/'
LUT_PATH = '/tmp/leica-cine/extracted/Leica Cine/Leica_Cine_Rec2020_LLog_to_Rec709_Gamma24_65_.cube'
PROFILE = '/tmp/lutcalc-leica-cine-regression'


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

    ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=45)
    request_id = 0

    def call(method, params=None):
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
    call('DOM.enable')
    call('Page.navigate', {'url': URL})
    time.sleep(8)
    engine_profile = evaluate("""(() => {
      const frame=document.querySelector('iframe');
      const Gamma=frame?.contentWindow?.LUTGamma;
      const gamma=Gamma ? new Gamma() : null;
      const profile=gamma?.gammas?.find(item=>item.name==='Leica L-Log');
      return {
        category: gamma?.subNames?.includes('Leica') || false,
        profile: Boolean(profile),
        rec2020: gamma?.gts?.[gamma?.gammas?.findIndex(item=>item.name==='Leica L-Log')] || '',
        midGray: profile?.linToData?.(0.18) || 0,
        white90: profile?.linToData?.(0.9) || 0
      };
    })()""") or {}

    evaluate("document.querySelector('.adjustment-lut-trigger')?.click(); true")
    time.sleep(.5)
    root = call('DOM.getDocument', {'depth': 2, 'pierce': True})['root']
    input_id = call('DOM.querySelector', {'nodeId': root['nodeId'], 'selector': '.lut-analysis-panel input[type=file]'})['nodeId']
    if not input_id:
        raise RuntimeError('工作台 LUTAnalyst 文件输入未找到')
    call('DOM.setFileInputFiles', {'nodeId': input_id, 'files': [LUT_PATH]})
    time.sleep(2)

    selected = evaluate("""(() => {
      const panel=document.querySelector('.lut-analysis-panel');
      const selects=[...(panel?.querySelectorAll('select') || [])];
      return {
        values: selects.map(node=>node.options[node.selectedIndex]?.textContent.trim() || ''),
        compatibility: panel?.querySelector('.lut-analyst-compatibility')?.textContent?.trim() || '',
        metadata: panel?.querySelector('.lut-analyst-metadata')?.textContent?.trim() || ''
      };
    })()""") or {}

    before = evaluate("""(() => {
      const d=document.querySelector('iframe')?.contentDocument;
      const gam=[...(d?.querySelectorAll('#box-gam select') || [])];
      return { curve:d?.querySelector('#can-stop-out')?.toDataURL('image/png')?.slice(-128) || '', output:gam[7]?.options[gam[7]?.selectedIndex]?.textContent?.trim() || '' };
    })()""") or {}
    evaluate("[...document.querySelectorAll('.lut-analyst-actions .is-primary')].find(node=>/分析 LUT/.test(node.textContent || ''))?.click(); true")

    final = {}
    for elapsed in range(1, 36):
        time.sleep(1)
        state = evaluate("""(() => {
          const d=document.querySelector('iframe')?.contentDocument;
          const gam=[...(d?.querySelectorAll('#box-gam select') || [])];
          return {
            elapsed:%d,
            outputGamma:gam[7]?.options[gam[7]?.selectedIndex]?.textContent?.trim() || '',
            outputGamut:gam[11]?.options[gam[11]?.selectedIndex]?.textContent?.trim() || '',
            curve:d?.querySelector('#can-stop-out')?.toDataURL('image/png')?.slice(-128) || '',
            analysis:document.querySelector('.lut-analysis-context')?.textContent?.trim() || '',
            summary:document.querySelector('.lut-analysis-result')?.textContent?.trim() || ''
          };
        })()""" % elapsed) or {}
        final = state
        if state.get('outputGamma', '').startswith('LA - ') and state.get('outputGamut', '').startswith('LA - ') and state.get('curve') != before.get('curve'):
            break

    result = {
        'engineProfile': engine_profile,
        'selection': selected,
        'before': before,
        'final': final,
    }
    result['passed'] = bool(
        engine_profile.get('category') and engine_profile.get('profile') and engine_profile.get('rec2020') == 'Rec2020'
        and round(engine_profile.get('midGray', 0) * 1023) == 445
        and selected.get('values') == ['Leica L-Log', 'Rec2020']
        and 'Leica Cine LUT' in selected.get('compatibility', '')
        and '65³' in selected.get('metadata', '') and '274,625' in selected.get('metadata', '') and 'Rec.709 / Gamma 2.4' in selected.get('metadata', '') and 'SHA-256' in selected.get('metadata', '')
        and final.get('outputGamma', '').startswith('LA - ') and final.get('outputGamut', '').startswith('LA - ')
        and final.get('curve') != before.get('curve') and '当前输出使用外部 LUT 分析结果' in final.get('analysis', '') and '65³' in final.get('summary', '')
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    if ws:
        ws.close()
    chrome.terminate()
    chrome.wait(timeout=5)
