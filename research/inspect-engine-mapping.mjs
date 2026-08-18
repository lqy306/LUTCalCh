const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find((item) => typeof item.url === 'string' && item.url.includes('3000-') && item.type === 'page');
if (!target) throw new Error('未找到 LUTCalc 页面');

const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;
const pending = new Map();
socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); const resolve = pending.get(message.id); if (resolve) { pending.delete(message.id); resolve(message); } });
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
const command = (method, params = {}) => new Promise((resolve, reject) => { const currentId = id++; pending.set(currentId, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id: currentId, method, params })); });
const response = await command('Runtime.evaluate', { expression: `(() => { const d = document.querySelector('iframe')?.contentDocument; const read = (root) => Array.from(d?.querySelectorAll(root + ' select') || []).map((s, i) => ({ i, value: s.value, first: s.options[0]?.textContent, selected: s.options[s.selectedIndex]?.textContent, count: s.options.length })); return { cam: read('#box-cam'), gam: read('#box-gam'), lut: read('#box-lut') }; })()`, returnByValue: true });
socket.close();
console.log(JSON.stringify(response.result.value, null, 2));
