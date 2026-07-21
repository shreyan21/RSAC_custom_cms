// Build a STRUCTURED spoken script from a page's main content instead of
// dumping raw text. Headings are announced as sections, "Label: Value" rows
// (profile tables, detail lists) are spoken as "Label: Value" so a listener can
// tell that, say, a Designation is "Senior Scientist" and a Name is "Dr. X".
// Works off DOM structure only, so it stays correct for any CMS-authored
// content — nothing is hardcoded to specific pages.

const clean = (value = "") => value.replace(/\s+/g, " ").trim();

export const buildPageSpeech = (root, t = (value) => value) => {
  if (!root) {
    return "";
  }

  const c = {
    page: t("Page"),
    section: t("Section"),
    end: t("End of content."),
  };
  const segments = [];
  const seen = new Set();

  const push = (text) => {
    const value = clean(text);
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    segments.push(value);
  };

  // A table row spoken as "first cell: remaining cells" reads like a fact
  // ("Designation: Senior Scientist") rather than a wall of words.
  const speakRow = (row) => {
    const cells = Array.from(row.querySelectorAll(":scope > td, :scope > th"))
      .map((cell) => clean(cell.textContent))
      .filter(Boolean);
    if (!cells.length) return;
    if (cells.length === 1) {
      push(cells[0]);
      return;
    }
    push(`${cells[0].replace(/[:：]$/, "")}: ${cells.slice(1).join(", ")}.`);
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;

  while (node) {
    const tag = node.tagName;

    if (/^H[1-6]$/.test(tag)) {
      const text = clean(node.textContent);
      if (text) {
        const cue = tag === "H1" ? c.page : c.section;
        push(`${cue}: ${text}.`);
      }
    } else if (tag === "TR") {
      speakRow(node);
    } else if (tag === "P" || tag === "BLOCKQUOTE" || tag === "FIGCAPTION") {
      push(node.textContent);
    } else if (tag === "LI") {
      // Leaf list items only — skip ones that wrap a nested list so we don't
      // read the parent text twice.
      if (!node.querySelector("ul, ol")) {
        push(node.textContent);
      }
    }

    node = walker.nextNode();
  }

  if (!segments.length) {
    return clean(root.innerText || "");
  }

  segments.push(c.end);
  return segments.join("  ");
};
