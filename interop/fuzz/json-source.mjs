// Locate a value in already-valid JSON without changing its source text.
export function jsonSourceAt(text, path) {
  let i = 0;
  const ws = () => { while (i < text.length && ' \t\r\n'.includes(text[i])) i++; };
  function string() {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') return text.slice(start, i);
    }
    throw new Error('unterminated JSON string');
  }
  function value(depth) {
    ws();
    const start = i, matches = [];
    if (text[i] === '{') {
      i++; ws();
      while (text[i] !== '}') {
        const key = JSON.parse(string());
        ws(); i++; // colon
        const child = value(depth + 1);
        if (depth < path.length && typeof path[depth] === 'string' && key === path[depth]) matches.push(child);
        ws();
        if (text[i] === ',') { i++; ws(); } else break;
      }
      i++;
    } else if (text[i] === '[') {
      i++; ws(); let index = 0;
      while (text[i] !== ']') {
        const child = value(depth + 1);
        if (depth < path.length && path[depth] === index) matches.push(child);
        index++; ws();
        if (text[i] === ',') { i++; ws(); } else break;
      }
      i++;
    } else if (text[i] === '"') {
      string();
    } else {
      while (i < text.length && !' \t\r\n,]}'.includes(text[i])) i++;
    }
    const end = i;
    if (depth === path.length) return { start, end };
    return { matches };
  }
  let node = value(0);
  for (const part of path) {
    if (typeof part !== 'string' && (!Number.isSafeInteger(part) || part < 0)) throw new Error('invalid JSON path');
    if (node.matches.length !== 1) throw new Error('missing or ambiguous JSON path');
    node = node.matches[0];
  }
  return text.slice(node.start, node.end);
}
