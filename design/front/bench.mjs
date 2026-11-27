export const LE = (() => {
  /* ---------- bytes ---------- */
  const B32 = "0123456789abcdefghijklmnopqrstuv";
  function b32(bytes) {
    let out = "", bits = 0, value = 0;
    for (const b of bytes) {
      value = ((value << 8) | b) & 0xffff; bits += 8;
      while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
  }
  function b32d(text) {
    const out = []; let bits = 0, value = 0;
    for (const c of text) {
      value = ((value << 5) | B32.indexOf(c)) & 0xffff; bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return Uint8Array.from(out);
  }
  const utf8 = (s) => new TextEncoder().encode(s);
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(msg) {
    const len = msg.length, n = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(msg); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(n - 4, (len * 8) >>> 0); dv.setUint32(n - 8, Math.floor(len / 0x20000000));
    const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    h.forEach((x, i) => ov.setUint32(i * 4, x));
    return out;
  }

  /* ---------- naming a record ---------- */
  // canonical JSON (RFC 8785 for the values these vectors hold). sorted: members by name, or as given.
  function canonical(v, sorted = true) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map((x) => canonical(x, sorted)).join(",") + "]";
    const ks = Object.keys(v);
    return "{" + (sorted ? ks.sort() : ks).map((k) => JSON.stringify(k) + ":" + canonical(v[k], sorted)).join(",") + "}";
  }
  // rules.sets: "set" sorts and removes repeats; "list" keeps the lists as written.
  function envJson(env, rules) {
    const out = { kind: env.kind, observer: env.observer, emitted: env.emitted };
    if (env.occurred !== undefined) out.occurred = env.occurred;
    for (const k of ["about", "prev", "erases"]) if (env[k] && env[k].length) out[k] = rules.sets === "set" ? [...new Set(env[k])].sort() : env[k].slice();
    if (env.of !== undefined) out.of = env.of;
    if (env.sets !== undefined) out.sets = rules.sets === "set" ? [...new Set(env.sets)].sort() : env.sets.slice();
    return out;
  }
  const cat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
  const commitOf = (salt, payload, rules) => "h:" + b32(sha256(cat(b32d(salt), utf8(canonical(payload, rules.members === "sorted")))));
  // rules.covers: "commit" hashes the envelope with a commitment to the payload; "payload" hashes
  // the payload itself, so a form without it (erased) hashes the envelope alone.
  function idOf(env, salt, payload, rules) {
    const sorted = rules.members === "sorted", e = envJson(env, rules);
    if (rules.covers === "commit") return "r:" + b32(sha256(utf8(canonical({ commit: commitOf(salt, payload, rules), env: e }, sorted))));
    return "r:" + b32(sha256(utf8(canonical(payload === undefined ? { env: e } : { env: e, payload }, sorted))));
  }
  // The id an erased form carries: the commitment is kept, so the id is the same one.
  function erasedIdOf(env, salt, payload, rules) {
    return rules.covers === "commit" ? idOf(env, salt, payload, rules) : idOf(env, salt, undefined, rules);
  }

  /* ---------- time and content order ---------- */
  const DAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daySecs = (y, m, d) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); return t.getTime() / 1000; };
  function instant(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(s);
    if (!m) return null;
    const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
    return [daySecs(y, mo, d) + h * 3600 + mi * 60 + se, m[7] || ""];
  }
  function dateSpan(s) {
    const span = (a, b) => [[a, ""], [b, ""]];
    let m;
    if ((m = /^(\d{2})XX$/.exec(s))) return span(daySecs(100 * m[1], 1, 1), daySecs(100 * m[1] + 100, 1, 1));
    if ((m = /^(\d{3})X$/.exec(s))) return span(daySecs(10 * m[1], 1, 1), daySecs(10 * m[1] + 10, 1, 1));
    if ((m = /^(\d{4})(?:-XX(?:-XX)?)?$/.exec(s))) return span(daySecs(+m[1], 1, 1), daySecs(+m[1] + 1, 1, 1));
    if ((m = /^(\d{4})-(\d{2})(?:-XX)?$/.exec(s))) return span(daySecs(+m[1], +m[2], 1), daySecs(+m[1], +m[2] + 1, 1));
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return span(daySecs(+m[1], +m[2], +m[3]), daySecs(+m[1], +m[2], +m[3] + 1));
    return null;
  }
  const point = (s) => (/[?~%]$/.test(s) ? dateSpan(s.slice(0, -1)) : s.includes("T") ? ((t) => t && [t, t])(instant(s)) : dateSpan(s));
  function spanOf(s) {
    const parts = s.split("/"), p = point(parts[0]);
    if (parts.length === 1) return { start: p[0], end: p[1] };
    if (parts[1] === "..") return { start: p[0], end: null };
    return { start: p[0], end: point(parts[1])[1] };
  }
  const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  function spanBefore(a, b) {
    if (before(a.start, b.start)) return true;
    if (before(b.start, a.start)) return false;
    if (a.end === null) return false;
    return b.end === null || before(a.end, b.end);
  }
  function idCmp(a, b) {
    const x = b32d(a.slice(2)), y = b32d(b.slice(2));
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return Math.sign(x.length - y.length);
  }
  const ALL = {"span":true,"emitted":true,"id":true};
  // Oldest first, over the keys switched on; 0 is a tie.
  function contentOrder(a, b, keys = ALL) {
    if (keys.span) {
      const x = spanOf(a.occurred ?? a.emitted), y = spanOf(b.occurred ?? b.emitted);
      if (spanBefore(x, y)) return -1;
      if (spanBefore(y, x)) return 1;
    }
    if (keys.emitted) {
      const p = instant(a.emitted), q = instant(b.emitted);
      if (before(p, q)) return -1;
      if (before(q, p)) return 1;
    }
    return keys.id ? idCmp(a.id, b.id) : 0;
  }

  /* ---------- counting ---------- */
  // rule: "every" adds one per delivery; "first" only the first time an id arrives;
  // "newer" only when a record was written after every record so far.
  function count(order, rule) {
    if (rule === "every") return order.length;
    if (rule === "first") return new Set(order.map((r) => r.id)).size;
    let n = 0, top = null;
    for (const r of order) { const t = instant(r.emitted); if (!top || before(top, t)) { n++; top = t; } }
    return n;
  }

  /* ---------- picking the current record ---------- */
  // rules.supersede: "any" (a record of the thing that names it in prev, whenever it arrives)
  // or "after" (only one that arrives after it). rules.winner: "newest", "last" or "first".
  // rules.keys: which parts of content order are compared.
  function latestBy(order, rules) {
    const first = new Map(), last = new Map(), recs = [];
    order.forEach((r, i) => { if (!first.has(r.id)) { first.set(r.id, i); recs.push(r); } last.set(r.id, i); });
    const things = new Map();
    for (const r of recs) { const t = r.of ?? r.id; if (!things.has(t)) things.set(t, []); things.get(t).push(r); }
    const out = {};
    for (const [t, rs] of things) {
      const gone = (r) => rs.some((q) => q.prev.includes(r.id) && (rules.supersede === "any" || first.get(q.id) > first.get(r.id)));
      const heads = rs.filter((r) => !gone(r)).sort((a, b) => contentOrder(b, a, rules.keys));
      let tie = false;
      for (let i = 1; i < heads.length; i++) if (contentOrder(heads[i - 1], heads[i], rules.keys) === 0) tie = true;
      let winner = heads[0] || null;
      if (rules.winner === "last") winner = heads.reduce((w, h) => (last.get(h.id) > last.get(w.id) ? h : w), heads[0]);
      if (rules.winner === "first") winner = heads.reduce((w, h) => (first.get(h.id) < first.get(w.id) ? h : w), heads[0]);
      out[t] = { heads: heads.map((h) => h.id), winner: winner && winner.id, tie, named: new Set(rs.flatMap((r) => r.prev)) };
    }
    return out;
  }
  const MODEL_LATEST = { supersede: "any", winner: "newest", keys: ALL };

  /* ---------- reading without payloads ---------- */
  const held = (r) => !r.shown || r.shown === "here";
  // rules.hidden: "supersedes" (a record without its payload still replaces what it names) or
  // "dropped" (it is left out). rules.unread: "count" or "skip".
  function view(order, rules) {
    let rs = order;
    if (rules.hidden === "dropped") rs = rs.filter(held);
    const st = latestBy(rs, MODEL_LATEST);
    const byId = new Map(order.map((r) => [r.id, r]));
    const heads = Object.values(st).flatMap((s) => s.heads).map((id) => byId.get(id)).sort((a, b) => contentOrder(b, a));
    const readable = heads.filter((r) => held(r) && r.fields && Number.isSafeInteger(r.fields.n));
    const value = readable.length ? Math.max(...readable.map((r) => r.fields.n)) : null;
    const missed = heads.length - readable.length;
    return { heads: heads.map((r) => ({ id: r.id, shown: held(r) ? "here" : r.shown })), max: { value, unread: rules.unread === "count" ? missed : 0 }, missed };
  }
  const fullReader = (order) => latestBy(order.map((r) => ({ ...r, shown: undefined })), MODEL_LATEST);

  /* ---------- text and back ---------- */
  const FENCE = ":::";
  // rules.escape: "both" (a body line that starts with ::: or a backslash gets one in front),
  // "fence" (only one that starts with :::), "none".
  const escapeLine = (line, rule) =>
    (rule === "both" && (line.startsWith("\\") || line.startsWith(FENCE))) || (rule === "fence" && line.startsWith(FENCE)) ? "\\" + line : line;
  const unescape = (line) => (line.startsWith("\\") && (line[1] === "\\" || line.slice(1).startsWith(FENCE)) ? line.slice(1) : line);
  const render = (sections, rule) => sections.flatMap((s) => [`${FENCE} ${s.id}`, ...s.body.map((l) => escapeLine(l, rule)), FENCE]);
  // Sections, or { error } saying where the text stops parsing.
  function parse(lines) {
    const sections = []; let open = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (open === null) {
        if (!line.startsWith(FENCE + " ") || line.length === FENCE.length + 1) return { error: line.trim() === "" ? `line ${i + 1} is blank, outside any section` : `line ${i + 1} is outside any section`, line: i };
        open = { id: line.slice(FENCE.length + 1), body: [] };
      } else if (line === FENCE) { sections.push(open); open = null; }
      else if (line.startsWith(FENCE)) return { error: `line ${i + 1} looks like a fence inside a body`, line: i };
      else open.body.push(unescape(line));
    }
    if (open !== null) return { error: `the section ${open.id} is never closed`, line: lines.length - 1 };
    if (new Set(sections.map((s) => s.id)).size !== sections.length) return { error: "a section id is given twice", line: -1 };
    return { sections };
  }
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  // rules.absent: "keep" (left as it was and reported absent), "report" (deleted and reported),
  // "silent" (deleted, and nothing said).
  function edit(base, lines, rules) {
    const p = parse(lines);
    if (p.error) return p;
    const held = new Map(base.map((s) => [s.id, s])), outcomes = [];
    for (const s of p.sections) {
      const was = held.get(s.id);
      if (!was) outcomes.push({ unknown: s.id });
      else if (!same(was.body, s.body)) outcomes.push({ accepted: s.id, body: s.body });
    }
    const seen = new Set(p.sections.map((s) => s.id));
    const missing = base.filter((s) => !seen.has(s.id)).map((s) => s.id);
    if (rules.absent === "keep") missing.forEach((id) => outcomes.push({ absent: id }));
    if (rules.absent === "report") missing.forEach((id) => outcomes.push({ deleted: id }));
    const acc = new Map(outcomes.filter((o) => "accepted" in o).map((o) => [o.accepted, o.body]));
    const applied = base.filter((s) => rules.absent === "keep" || seen.has(s.id)).map((s) => (acc.has(s.id) ? { id: s.id, body: acc.get(s.id) } : s));
    return { sections: p.sections, normalized: render(p.sections, "both"), outcomes, applied };
  }

  return { b32, b32d, sha256, utf8, canonical, envJson, commitOf, idOf, erasedIdOf, contentOrder, count, latestBy, MODEL_LATEST, view, fullReader, held, render, parse, edit, escapeLine, same };
})();
