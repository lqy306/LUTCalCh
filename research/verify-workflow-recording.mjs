const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find((item) => typeof item.url === 'string' && item.url.includes('3000-') && item.type === 'page');

if (!target) throw new Error('未找到 LUTCalc 页面目标');

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const resolver = pending.get(message.id);
  if (resolver) {
    pending.delete(message.id);
    resolver(message);
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function command(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const outcome = await evaluate(`(async () => {
  const findButton = (text) => Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes(text));
  const start = findButton('开始记录');
  if (!start) return { ok: false, reason: '找不到开始记录按钮' };
  start.click();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const frame = document.querySelector('iframe');
  const stopInput = frame?.contentDocument?.querySelector('#box-cam .shift-input');
  if (!stopInput) return { ok: false, reason: '找不到核心挡位修正控件' };
  stopInput.value = '0.5';
  stopInput.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 180));
  const countText = Array.from(document.querySelectorAll('*')).map((node) => node.textContent).find((text) => /^\\d+ 步$/.test((text || '').trim()));
  const stop = findButton('停止记录');
  stop?.click();
  await new Promise((resolve) => setTimeout(resolve, 80));
  findButton('保存流程')?.click();
  await new Promise((resolve) => setTimeout(resolve, 120));
  stopInput.value = '0';
  stopInput.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 100));
  findButton('执行')?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
  const replayedValue = stopInput.value;
  findButton('清空当前')?.click();
  return { ok: Boolean(countText && Number.parseInt(countText, 10) >= 1 && replayedValue === '0.5'), countText: countText || null, replayedValue };
})()`);

socket.close();
console.log(JSON.stringify(outcome));
if (!outcome.ok) process.exitCode = 1;
