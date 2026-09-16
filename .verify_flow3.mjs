import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const PORT = 9368;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "cdp-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {} await sleep(250); }
const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? "").join(" ").slice(0, 120));
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (e) => send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }).then((r) => r.result?.result?.value);
const log = (l, v) => console.log(l, JSON.stringify(v));
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:4827/book" });
for (let i = 0; i < 40; i++) { if ((await ev("document.readyState")) === "complete") break; await sleep(250); }
await sleep(1800);

// stage 1: pick day + slot, continue (creates hold — 503 unconfigured expected)
const dayOk = await ev(`(() => {
  const days = [...document.querySelectorAll('button[aria-label]')].filter((b) => /^\\d{4}-\\d{2}-\\d{2}$/.test(b.getAttribute('aria-label')) && !b.disabled);
  days[1]?.click();
  return days.length;
})()`);
await sleep(300);
const slotOk = await ev(`(() => {
  const s = [...document.querySelectorAll('main button')].filter((b) => /\\d{1,2}:\\d{2} (AM|PM)/.test(b.textContent) && !b.disabled);
  s[0]?.click();
  return s.length;
})()`);
await ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes("Continue")); b?.click(); return true; })()`);
await sleep(800);
const st2 = await ev(`(() => ({ detailsShown: !!document.querySelector("#bf-first"), reviewButton: [...document.querySelectorAll('button')].some((b) => b.textContent.includes("Review & Confirm")) }))()`);
log("stage1→2:", st2);

// stage 2: fill details, continue → stage 3
await ev(`(() => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const fill = (idv, v) => { const el = document.querySelector("#" + idv); set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
  fill("bf-first", "Test"); fill("bf-last", "User"); fill("bf-email", "t@e.com"); fill("bf-phone", "5125550143");
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Review & Confirm")); b?.click();
  return true;
})()`);
await sleep(600);
const st3 = await ev(`(() => ({
  consentBox: !!document.querySelector('main input[type="checkbox"]'),
  addPaymentBtn: [...document.querySelectorAll('button')].some((b) => b.textContent.includes("Add payment method")),
  summaryShown: document.body.textContent.includes("Review & Confirm"),
}))()`);
log("stage3:", st3);

// consent + click Add payment method (no ANET creds → friendly 503 error expected)
await ev(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes("Add payment method")); b?.click(); return !!b; })()`);
await sleep(1500);
const after = await ev(`(() => ({
  errorShown: (document.querySelector('[role="alert"]')?.textContent ?? "").slice(0, 90) || null,
  configNote: document.body.textContent.includes("not configured yet"),
}))()`);
log("after add-payment:", after);
console.log("console errors:", errors.length);
errors.slice(0, 4).forEach((e) => console.log("  ", e));
ws.close(); proc.kill(); process.exit(0);
