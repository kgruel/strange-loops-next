// Portable record helpers. The Node writer re-exports the same functions.
// Readers use these helpers without loading signing or hashing code.

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

export function base32(bytes) {
  let out = "", bits = 0, value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const out = [];
  let bits = 0, value = 0;
  for (const c of text) {
    const v = B32.indexOf(c);
    if (v < 0) throw new Error(`not base32: ${c}`);
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

// RFC 8785. Numbers use ECMAScript's own formatting, which is the RFC's.
export function canonical(v) {
  if (v === null || typeof v === "boolean" || typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("JCS has no NaN or Infinity");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}

// Sets: sorted by UTF-16 code units (JavaScript's default sort), repeats removed.
const canonSet = (xs) => [...new Set(xs)].sort();

export function envJson(env) {
  const out = { kind: env.kind, observer: env.observer, emitted: env.emitted };
  if (env.occurred !== undefined) out.occurred = env.occurred;
  for (const k of ["about", "prev", "erases"]) {
    if (env[k] && env[k].length) out[k] = canonSet(env[k]);
  }
  if (env.under !== undefined) out.under = env.under;
  return out;
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function validEmitted(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  if (mo < 1 || mo > 12) return false;
  const days = mo === 2 && leap(y) ? 29 : DAYS[mo - 1];
  if (d < 1 || d > days || h > 23 || mi > 59 || se > 60) return false;
  if (m[8] !== "Z" && (Number(m[9]) > 23 || Number(m[10]) > 59)) return false;
  return true;
}

// A moment: whole seconds since 1970-01-01T00:00:00Z, then the fraction's
// digits with trailing zeros dropped. A leap second is the next minute's first.
// setUTCFullYear, because Date.UTC reads years 0 to 99 as 1900 to 1999.
const daySecs = (y, m, d) => {
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  return t.getTime() / 1000;
};

function instantMoment(s) {
  if (!validEmitted(s)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(s);
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  const off = m[8] === undefined ? 0 : (m[8] === "+" ? 1 : -1) * (Number(m[9]) * 3600 + Number(m[10]) * 60);
  return [daySecs(y, mo, d) + h * 3600 + mi * 60 + se - off, (m[7] ?? "").replace(/0+$/, "")];
}

// A calendar date's first moment and the moment after its last.
function dateMoments(s) {
  const span = (a, b) => [[a, ""], [b, ""]];
  let m;
  if ((m = /^(\d{2})XX$/.exec(s))) return span(daySecs(100 * m[1], 1, 1), daySecs(100 * m[1] + 100, 1, 1));
  if ((m = /^(\d{3})X$/.exec(s))) return span(daySecs(10 * m[1], 1, 1), daySecs(10 * m[1] + 10, 1, 1));
  if ((m = /^(\d{4})(?:-XX(?:-XX)?)?$/.exec(s))) return span(daySecs(+m[1], 1, 1), daySecs(+m[1] + 1, 1, 1));
  if ((m = /^(\d{4})-(\d{2})(?:-XX)?$/.exec(s))) {
    const [y, mo] = [+m[1], +m[2]];
    return mo >= 1 && mo <= 12 ? span(daySecs(y, mo, 1), daySecs(y, mo + 1, 1)) : null;
  }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    if (mo < 1 || mo > 12 || d < 1 || d > (mo === 2 && leap(y) ? 29 : DAYS[mo - 1])) return null;
    return span(daySecs(y, mo, d), daySecs(y, mo, d + 1));
  }
  return null;
}

function pointMoments(s) {
  if (/[?~%]$/.test(s)) return dateMoments(s.slice(0, -1));
  if (s.includes("T")) {
    const t = instantMoment(s);
    return t && [t, t];
  }
  return dateMoments(s);
}

export const momentBefore = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

// occurred: its span, { start, end }, end null when open; null if it isn't one.
export function occurredSpan(s) {
  const parts = s.split("/");
  if (parts.length === 1) {
    const p = pointMoments(parts[0]);
    return p && { start: p[0], end: p[1] };
  }
  if (parts.length !== 2) return null;
  const p = pointMoments(parts[0]);
  if (!p) return null;
  if (parts[1] === "..") return { start: p[0], end: null };
  const q = pointMoments(parts[1]);
  if (!q || momentBefore(q[0], p[0])) return null;
  return { start: p[0], end: q[1] };
}

// Spans oldest first: by start, then end, an open end last.
export function spanBefore(a, b) {
  if (momentBefore(a.start, b.start)) return true;
  if (momentBefore(b.start, a.start)) return false;
  if (a.end === null) return false;
  return b.end === null || momentBefore(a.end, b.end);
}

const typedRef = (s) => /^[a-z][a-z0-9-]*:./su.test(s);
const recordId = (s) => /^r:[a-z2-7]{52}$/.test(s);

export function problem(env) {
  if (!env.kind) return "kind-empty";
  if (!typedRef(env.observer)) return "observer-not-typed";
  if (!validEmitted(env.emitted)) return "emitted-not-rfc3339";
  if (env.occurred !== undefined && !occurredSpan(env.occurred)) return "occurred-not-span";
  if (!(env.about ?? []).every(typedRef)) return "about-not-typed";
  if (!(env.prev ?? []).every(recordId)) return "prev-not-record-id";
  if (env.under !== undefined && !recordId(env.under)) return "under-not-record-id";
  if (!(env.erases ?? []).every(recordId)) return "erases-not-record-id";
  return null;
}
