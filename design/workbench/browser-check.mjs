// Build first. Run with Node 22+ and Chrome. No packages or browser drivers.
// CHROME=/path/to/chrome node design/workbench/browser-check.mjs [screenshot-directory]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const out = join(root, "out");
const shots = resolve(process.argv[2] ?? join(root, ".pi", "screenshots"));
mkdirSync(shots, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "workbench-chrome-"));
const server = createServer((req, res) => {
  const path = resolve(out, `.${decodeURIComponent(new URL(req.url, "http://local").pathname)}`, "index.html");
  if (!path.startsWith(out + sep)) { res.writeHead(403).end(); return; }
  try { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(readFileSync(path)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/workbench/`;
const chrome = spawn(process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
let chromeError, chromeLog = "", ws;
chrome.on("error", (error) => { chromeError = error; });
chrome.stderr.on("data", (chunk) => { chromeLog += chunk; });
const pending = new Map(), errors = [];
let next = 0;
async function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30_000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function ready() {
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!document.querySelector("#workbench-data") && !!document.querySelector("#raw")?.value')) return;
    await delay(50);
  }
  throw new Error("Workbench did not start");
}
async function navigate(hash = "") {
  await command("Page.navigate", { url: url + hash });
  await ready();
}

// This runs inside Chrome against the rendered UI, not against a Node-only copy.
async function exercise() {
  const $ = (id) => document.getElementById(id);
  const check = (condition, label) => { if (!condition) throw new Error(label); };
  const change = (id, value, type = "change") => { $(id).value = value; $(id).dispatchEvent(new Event(type, { bubbles: true })); };
  const click = (id) => $(id).click();
  const pause = () => new Promise((resolve) => setTimeout(resolve, 450));
  const { runScenario, equal, stringify, parseVector } = await import("@workbench/design/workbench/runtime.mjs");
  const data = JSON.parse($("workbench-data").textContent);
  const raw = () => parseVector($("raw").value);
  const good = () => !$("save-slot").disabled;
  let orderCount = 0;
  for (const preset of data.presets) {
    change("preset", preset.path);
    check(good() && $("scenario-status").dataset.match === "true", `preset: ${preset.path}`);
    const answer = runScenario(preset.vector.input);
    check(equal(answer.expect, preset.vector.expect), `browser reader: ${preset.path}`);
    for (const [i, step] of preset.vector.input.steps.entries()) {
      change("result-step", i);
      check($("order-lanes").children.length === step.orders.length, `all lanes: ${preset.path}/${i}`);
      orderCount += step.orders.length;
    }
  }
  change("preset", data.presets[0].path);
  const baseline = raw().expect;
  change("record-value", '<img src=x onerror="window.injected=true">');
  check(raw().input.records[0].value.startsWith("<img"), "structured edit sync");
  check(!document.querySelector(".workbench img") && !window.injected, "payload remains text");
  check(equal(raw().expect, baseline), "baseline stays unchanged");
  check(equal(parseVector(decodeURIComponent(location.hash.slice(10))), raw()), "URL contains whole vector");
  click("add-record");
  const id = raw().input.records.at(-1).id;
  check(/^r:[a-z2-7]{52}$/.test(id) && good(), "new valid record");
  click("remove-record");
  check(!raw().input.records.some((r) => r.id === id) && good(), "remove record");
  const count = raw().input.steps.length;
  click("add-step"); check(raw().input.steps.length === count + 1 && good(), "add step");
  click("remove-step"); check(raw().input.steps.length === count && good(), "remove step");
  change("step-select", 0);
  const orders = raw().input.steps[0].orders.length;
  click("reverse-order"); check(raw().input.steps[0].orders.length === orders + 1 && good(), "reverse order");
  change("form-0", "withheld"); check(raw().input.steps[0].forms.find((f) => f.id === raw().input.records[0].id).shown === "withheld" && good(), "form edit");
  const saved = $("raw").value, hash = location.hash;
  change("raw", "{", "input"); await pause();
  check(!good() && $("export-vector").disabled && !$("order-lanes").children.length && location.hash === hash, "invalid draft cannot leak stale results");
  change("raw", saved, "input"); await pause(); check(good(), "raw recovery");
  change("record-about", "not JSON"); check(!good(), "invalid structured JSON");
  change("record-about", '["decision:auth"]'); check(good(), "structured recovery");
  for (const boundary of data.boundaries) {
    change("boundary-select", boundary.law);
    check($("boundary-result").textContent.includes("law holds: yes"), `premise present: ${boundary.law}`);
    click("remove-premise");
    check($("boundary-result").textContent.includes("law holds: no"), `premise removed: ${boundary.law}`);
    if (boundary.law === "record.member-order") check($("boundary-result").textContent.includes("No live result"), "model-only scope");
  }
  change("preset", data.presets[0].path);
  change("slot-name", "browser test"); click("save-slot");
  const stored = $("raw").value;
  change("record-value", "after save"); click("load-slot");
  check($("raw").value === stored && good(), "named slot roundtrip");
  click("delete-slot"); check(![...$("slots").options].some((o) => o.value === "browser test"), "delete slot");
  let downloaded;
  const create = URL.createObjectURL, anchorClick = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = (blob) => { downloaded = blob; return "blob:workbench-test"; };
  HTMLAnchorElement.prototype.click = function () {};
  click("export-vector");
  URL.createObjectURL = create; HTMLAnchorElement.prototype.click = anchorClick;
  check(equal(parseVector(await downloaded.text()), raw()), "export exact vector");
  const file = new File([stored], "import.json", { type: "application/json" });
  const transfer = new DataTransfer(); transfer.items.add(file); $("import-file").files = transfer.files;
  $("import-file").dispatchEvent(new Event("change")); await pause();
  check(good() && $("keep-status").textContent.includes("Imported"), "file import");
  // An older asynchronous read must not clear a later successful preset.
  let rejectRead;
  Object.defineProperty($("import-file"), "files", { configurable: true, value: [{ text: () => new Promise((_, reject) => { rejectRead = reject; }) }] });
  $("import-file").dispatchEvent(new Event("change"));
  change("preset", data.presets[1].path);
  rejectRead(new Error("old read failed")); await pause();
  delete $("import-file").files;
  check(good() && $("scenario-status").dataset.match === "true", "superseded import failure");
  // Exact large fold results survive baseline edits, URLs, and named slots.
  const large = raw();
  large.input.records = large.input.records.slice(0, 2).map((r, i) => ({ ...r, prev: [], n: i ? 2 : Number.MAX_SAFE_INTEGER }));
  large.input.spec = { vertex: "large", from: [{ store: "." }], fold: { total: { sum: "n" } } };
  delete large.input.mayReplace; delete large.input.lens;
  const ids = large.input.records.map((r) => r.id);
  large.input.steps = [{ name: "sum", forms: ids.map((id) => ({ id, shown: "here" })), orders: [ids] }];
  large.expect = runScenario(large.input).expect;
  check(large.expect.steps[0].slots.total.value === 9007199254740993n, "large sum fixture");
  change("raw", stringify(large), "input"); await pause();
  check(good() && $("scenario-status").dataset.match === "true", "exact large baseline");
  change("slot-name", "large sum"); click("save-slot"); click("load-slot");
  check(good() && $("scenario-status").dataset.match === "true", "large baseline storage");
  check(equal(parseVector(decodeURIComponent(location.hash.slice(10))), large), "large baseline URL");
  click("delete-slot");
  // A full storage device must not disable the rest of the page.
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  click("save-slot"); Storage.prototype.setItem = setItem;
  check(good() && $("keep-error").textContent.includes("unavailable"), "storage quota");
  change("preset", data.presets[0].path);
  const shareHash = location.hash;
  document.querySelector('a[href="#results"]').click();
  check(location.hash === shareHash, "section navigation keeps share link");
  return { presets: data.presets.length, orders: orderCount, boundaries: data.boundaries.length, shareHash };
}

try {
  let port;
  for (let i = 0; i < 100; i++) {
    if (chromeError) throw chromeError;
    try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); break; } catch {}
    await delay(100);
  }
  if (!port) throw new Error(`Chrome did not start: ${chromeLog.slice(-3000)}`);
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  ws.addEventListener("message", ({ data }) => {
    const reply = JSON.parse(data);
    if (reply.id) {
      const waiter = pending.get(reply.id); pending.delete(reply.id);
      if (reply.error) waiter?.reject(new Error(reply.error.message)); else waiter?.resolve(reply.result);
    } else if (reply.method === "Runtime.exceptionThrown") errors.push(reply.params.exceptionDetails.text);
  });
  await command("Page.enable"); await command("Runtime.enable");
  await navigate();
  const result = await evaluate(`(${exercise.toString()})()`);
  console.log(`Browser: ${result.presets} presets, ${result.orders} orders, ${result.boundaries} premises; edit, raw, storage, file, exact-number, and race checks pass.`);
  await navigate(result.shareHash);
  assert.equal(await evaluate('document.querySelector("#scenario-status").dataset.match'), "true", "share reload");
  await navigate("#preset=scenario%2F19-erasure");
  assert.equal(await evaluate('document.querySelector("#preset").value'), "scenario/19-erasure", "preset link");
  const blocked = await command("Page.addScriptToEvaluateOnNewDocument", { source: 'Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });' });
  await navigate();
  assert.equal(await evaluate('!document.querySelector("#save-slot").disabled && document.querySelector("#keep-error").textContent.includes("unavailable")'), true, "blocked storage startup");
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: blocked.identifier });
  await navigate();
  for (const width of [1280, 390]) for (const scheme of ["light", "dark"]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    await evaluate(`(() => {
      const presets = JSON.parse(document.querySelector("#workbench-data").textContent).presets;
      for (const preset of presets) {
        const select = document.querySelector("#preset"); select.value = preset.path; select.dispatchEvent(new Event("change"));
        if (document.documentElement.scrollWidth > innerWidth) throw new Error("Page overflow: " + preset.path);
      }
    })()`);
    await evaluate('document.documentElement.style.scrollBehavior="auto"; document.querySelector("#preset").value="scenario/01-decision"; document.querySelector("#preset").dispatchEvent(new Event("change")); document.querySelector("#result-step").value="2"; document.querySelector("#result-step").dispatchEvent(new Event("change")); window.scrollTo({top:0,behavior:"instant"})');
    await delay(200);
    const size = await evaluate('({ width: innerWidth, scroll: document.documentElement.scrollWidth })');
    assert.ok(size.scroll <= size.width, `${width}/${scheme}: page overflows ${JSON.stringify(size)}`);
    for (const section of ["top", "results", "break"]) {
      await evaluate(section === "top" ? 'window.scrollTo({top:0,behavior:"instant"})' : `document.querySelector("#${section}").scrollIntoView({block:"start",behavior:"instant"})`);
      await delay(100);
      const { data } = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(shots, `workbench-${width}-${scheme}-${section}.png`), Buffer.from(data, "base64"));
    }
    console.log(`Layout: ${width}px ${scheme}; document scroll width ${size.scroll}px.`);
  }
  assert.deepEqual(errors, [], "browser exceptions");
  console.log(`Screenshots: ${shots}`);
} finally {
  ws?.close();
  chrome.kill("SIGTERM");
  if (chrome.exitCode === null && !chromeError) await new Promise((resolve) => chrome.once("exit", resolve));
  await new Promise((resolve) => server.close(resolve));
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
