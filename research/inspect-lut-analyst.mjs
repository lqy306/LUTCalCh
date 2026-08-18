const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find((item) => typeof item.url === 'string' && item.url.includes('3000-') && item.type === 'page');
if (!target) throw new Error('未找到 LUTCalc 页面');

const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();
socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); const resolve = pending.get(message.id); if (resolve) { pending.delete(message.id); resolve(message); } });
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve, reject) => { const currentId = id++; pending.set(currentId, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id: currentId, method, params })); });
const response = await command('Runtime.evaluate', { expression: `(() => { const d = document.querySelector('iframe')?.contentDocument; const box = d?.querySelector('#box-twk'); if (!box) return null; const all = Array.from(box.querySelectorAll('input[type=button],button')).map((node, index) => ({index, value: node.value, text: node.textContent, className: node.className})); return {files: Array.from(box.querySelectorAll('input[type=file]')).map((node, index) => ({index, accept: node.accept, className: node.className})), analystButtons: all.filter((item) => /Analyse|Re-Analyse|New LUT|Save Cube|Save Binary|Declip/i.test(item.value + item.text)), newLoadRadios: Array.from(box.querySelectorAll('input[name=newOrLoad]')).map((node, index) => ({index, checked: node.checked, className: node.className}))}; })()`, returnByValue: true });
socket.close();
console.log(JSON.stringify(response.result.value, null, 2));
