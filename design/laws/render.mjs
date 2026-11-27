import { inline } from "../protocol.mjs";

export const unlessSaid = (premises) => `Unless a law says otherwise, ${premises.pageWide.join(", and ")}.`;

export function lawNotes({ notes, fail }, heading) {
  return (notes[heading] ?? fail(`laws.md has no notes under ${heading}`)).map((bullet) => {
    const m = bullet.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    return m ? { k: inline(m[1]), v: inline(m[2]) } : { k: "", v: inline(bullet) };
  });
}
