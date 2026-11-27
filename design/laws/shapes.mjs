// Plain text for a law chip, including its exponents.
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
export const plain = (html, exponent = "^$1") => decode(html.replace(/<sup>(.*?)<\/sup>/g, exponent).replace(/<[^>]+>/g, ""));
