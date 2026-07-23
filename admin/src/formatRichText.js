const contentSelectors = "img,video,audio,iframe,table";
const emptyBlockSelectors = "p,li,blockquote,h2,h3,h4";

const hasVisibleContent = (element) =>
  String(element.textContent || "").replace(/\u00a0/gu, " ").trim() ||
  element.querySelector(contentSelectors);

export const formatRichTextHtml = (html) => {
  const parser = new DOMParser();
  const document = parser.parseFromString("<!doctype html><body></body>", "text/html");
  const root = document.createElement("div");
  root.innerHTML = String(html || "");
  document.body.append(root);

  root.querySelectorAll("script,style").forEach((element) => element.remove());

  const walker = document.createTreeWalker(root, 4);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (node.parentElement?.closest("pre,code")) return;
    node.nodeValue = String(node.nodeValue || "")
      .replace(/\u00a0/gu, " ")
      .replace(/[ \t\f\v]+/gu, " ");
  });

  root.querySelectorAll(emptyBlockSelectors).forEach((element) => {
    if (!hasVisibleContent(element)) element.remove();
  });
  root.querySelectorAll("ul,ol").forEach((list) => {
    if (![...list.children].some((child) => child.tagName === "LI")) list.remove();
  });
  root.querySelectorAll("strong,em,u,span").forEach((element) => {
    if (!hasVisibleContent(element)) element.remove();
  });

  root.normalize();
  return root.innerHTML
    .replace(/(?:<br\s*\/?>\s*){3,}/giu, "<br><br>")
    .replace(/>\s+</gu, "><")
    .trim();
};
