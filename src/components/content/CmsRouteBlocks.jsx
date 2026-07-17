import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const gridColumns = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

const asItems = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => String(value || "");
const blockType = (block) => asText(block?.type || block?.kind || "rich_text")
  .trim()
  .toLowerCase()
  .replace(/[ -]+/g, "_");
const columns = (value, fallback = 3) => gridColumns[Math.min(4, Math.max(1, Number(value) || fallback))];

const blockProps = (block, className) => ({
  className: `${className} cms-flexible-block`,
  "data-cms-text-size": block.textSize || "normal",
  "data-cms-media-size": block.mediaSize || "normal",
  "data-cms-spacing": block.spacing || "normal",
});

function BlockHeading({ block }) {
  const heading = block.heading || block.title;
  if (!heading || block.showHeading === false) return null;

  return (
    <header className="mb-4">
      {block.eyebrow && <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0b6fa4]">{block.eyebrow}</p>}
      <h2 className="text-xl font-extrabold leading-snug text-[#102f46] sm:text-2xl">{heading}</h2>
      {block.intro && <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">{block.intro}</p>}
    </header>
  );
}

const isInternalPage = (href) => /^\/(?!\/)/.test(href)
  && !/^\/(?:cms-media|official-media|documents|uploads|sites)\//i.test(href)
  && !/\.[a-z0-9]{2,6}(?:[?#]|$)/i.test(href);

function BlockLink({ item, className = "" }) {
  const href = item?.url || item?.path || item?.href || "";
  const label = item?.linkLabel || item?.label || item?.title || "Open";
  if (!href) return null;

  const classes = `inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white no-underline transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] ${className}`;
  const content = <><span>{label}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></>;

  if (isInternalPage(href)) return <Link to={href} className={classes}>{content}</Link>;
  return <a href={href} className={classes} target={/^https?:/i.test(href) ? "_blank" : undefined} rel={/^https?:/i.test(href) ? "noreferrer" : undefined}>{content}</a>;
}

export default function CmsRouteBlocks({ blocks, className = "" }) {
  const visibleBlocks = asItems(blocks).filter((block) => block && block.hidden !== true && block.enabled !== false);
  if (!visibleBlocks.length) return null;

  return (
    <div className={`cms-flexible-layout ${className}`.trim()} data-cms-layout="route-content">
      {visibleBlocks.map((block, blockIndex) => {
        const type = blockType(block);
        const key = block.id || block.key || `${type}-${blockIndex}`;
        const items = asItems(block.items);
        const shellClass = block.variant === "plain" ? "min-w-0" : "min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5";
        const shellProps = blockProps(block, shellClass);

        if (["rich_text", "text", "html", "body"].includes(type)) {
          const html = block.html || block.body || block.text || "";
          if (!html) return null;
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className="rsac-rich-content" dangerouslySetInnerHTML={{ __html: html }} />
            </section>
          );
        }

        if (type === "divider") return <hr key={key} className="border-0 border-t border-slate-200" />;

        if (type === "hero") {
          const image = block.image || block.src;
          return (
            <section key={key} {...blockProps(block, "cms-flexible-hero relative min-h-64 overflow-hidden rounded-lg bg-[#102f46]")}>
              {image && <img src={image} alt={asText(block.alt)} className="cms-flexible-media absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <div className={`relative z-[1] flex min-h-64 max-w-3xl flex-col justify-end p-5 text-white sm:p-7 ${image ? "bg-[linear-gradient(90deg,rgba(8,32,50,0.92)_0%,rgba(8,32,50,0.62)_72%,transparent_100%)]" : ""}`}>
                {block.eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-200">{block.eyebrow}</p>}
                {(block.heading || block.title) && <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{block.heading || block.title}</h2>}
                {(block.text || block.intro) && <p className="mt-3 leading-relaxed text-white/90">{block.text || block.intro}</p>}
              </div>
            </section>
          );
        }

        if (type === "image") {
          const image = block.image || block.src || block.url;
          if (!image) return null;
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <figure className="cms-flexible-figure">
                <img src={image} alt={asText(block.alt || block.heading)} className="cms-flexible-media" loading="lazy" />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            </section>
          );
        }

        if (type === "gallery") {
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className={`cms-flexible-gallery grid gap-4 ${columns(block.columns, 3)}`}>
                {items.map((item, itemIndex) => {
                  const value = typeof item === "string" ? { url: item } : item;
                  const image = value.image || value.src || value.url;
                  if (!image) return null;
                  return (
                    <figure key={value.id || `${key}-image-${itemIndex}`} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-[#f8fbfd]">
                      <img src={image} alt={asText(value.alt || value.title)} className="cms-flexible-media w-full object-contain" loading="lazy" />
                      {(value.caption || value.title) && <figcaption className="p-3 text-sm font-semibold leading-relaxed text-slate-700">{value.caption || value.title}</figcaption>}
                    </figure>
                  );
                })}
              </div>
            </section>
          );
        }

        if (type === "cards") {
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className={`grid items-stretch gap-4 ${columns(block.columns)}`}>
                {items.map((item, itemIndex) => (
                  <article key={item.id || item.key || `${key}-card-${itemIndex}`} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#fbfdfc] shadow-[0_10px_28px_rgba(18,50,74,0.055)]">
                    {(item.image || item.src) && <img src={item.image || item.src} alt={asText(item.alt || item.title)} className="cms-flexible-media aspect-[16/9] w-full object-cover" loading="lazy" />}
                    <div className="flex flex-1 flex-col p-4">
                      {item.title && <h3 className="text-lg font-extrabold leading-snug text-[#102f46]">{item.title}</h3>}
                      {(item.text || item.summary || item.description) && <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text || item.summary || item.description}</p>}
                      {(item.url || item.path || item.href) && <div className="mt-auto pt-4"><BlockLink item={item} /></div>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (["list", "ordered_list"].includes(type)) {
          const ordered = type === "ordered_list" || block.ordered === true;
          const ListTag = ordered ? "ol" : "ul";
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <ListTag className={`${ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6 text-sm leading-relaxed text-slate-700 marker:font-bold marker:text-orange-500`}>
                {items.map((item, itemIndex) => {
                  const value = typeof item === "string" ? { text: item } : item;
                  return <li key={value.id || `${key}-item-${itemIndex}`}>{value.title && <strong className="text-[#102f46]">{value.title}: </strong>}{value.text || value.summary || value.label}</li>;
                })}
              </ListTag>
            </section>
          );
        }

        if (type === "stats") {
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className={`grid gap-3 ${columns(block.columns, 4)}`}>
                {items.map((item, itemIndex) => <div key={item.id || `${key}-stat-${itemIndex}`} className="rounded-lg border border-emerald-900/10 bg-emerald-50/60 p-4 text-center"><strong className="block text-2xl font-extrabold text-[#0f6f42]">{item.value}</strong><span className="mt-1 block text-sm font-semibold text-slate-700">{item.label || item.title}</span></div>)}
              </div>
            </section>
          );
        }

        if (type === "table") {
          const headers = asItems(block.headers || block.columns);
          const rows = asItems(block.rows);
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  {headers.length > 0 && <thead className="bg-[#eef8ff] text-[#102f46]"><tr>{headers.map((header, index) => <th key={`${key}-head-${index}`} className="border-b border-slate-200 p-3 font-extrabold">{header.label || header}</th>)}</tr></thead>}
                  <tbody>{rows.map((row, rowIndex) => <tr key={`${key}-row-${rowIndex}`} className="border-b border-slate-100 last:border-0">{asItems(row).map((cell, cellIndex) => <td key={`${key}-cell-${rowIndex}-${cellIndex}`} className="p-3 align-top text-slate-700">{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </section>
          );
        }

        if (["links", "buttons"].includes(type)) {
          return (
            <section key={key} {...shellProps}>
              <BlockHeading block={block} />
              <div className="flex flex-wrap gap-3">{items.map((item, itemIndex) => <BlockLink key={item.id || `${key}-link-${itemIndex}`} item={typeof item === "string" ? { title: item, url: item } : item} />)}</div>
            </section>
          );
        }

        if (["callout", "note"].includes(type)) {
          return <aside key={key} {...blockProps(block, "rounded-lg border-l-4 border-[#0b6fa4] bg-sky-50 p-4 text-sm leading-relaxed text-slate-700")}><BlockHeading block={block} />{block.text || block.body}</aside>;
        }

        return null;
      })}
    </div>
  );
}
