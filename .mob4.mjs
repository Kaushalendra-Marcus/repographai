// Temporary small-phone audit. Delete after use.
import { writeFileSync } from 'fs';
const PORT = 9337;
const tabs = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json());
const wsUrl = (tabs.find(t => t.type === 'page') || tabs[0]).webSocketDebuggerUrl;
const ws = new globalThis.WebSocket(wsUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise(r => (ws.onopen = r));
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://localhost:8910/' });
await new Promise(r => setTimeout(r, 2800));
const ov = await send('Runtime.evaluate', {
  expression: `(()=>({vw:document.documentElement.clientWidth,bodySW:document.body.scrollWidth}))()`,
  returnByValue: true
});
console.log('overflow:', JSON.stringify(ov.result.value));
for (const [sel, name] of [['.hero', 's-hero'], ['footer', 's-foot']]) {
  await send('Runtime.evaluate', { expression: `document.querySelector('${sel}').scrollIntoView({block:'start',behavior:'instant'})` });
  await new Promise(r => setTimeout(r, 700));
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/shots/' + name + '.png', Buffer.from(s.data, 'base64'));
}
console.log('saved');
ws.close();
