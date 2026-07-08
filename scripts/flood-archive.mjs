// Mirror the official RSAC-UP year-wise flood report archive locally.
//
// For every year page on the legacy site (https://rsac.up.gov.in/en/page/flood-YYYY)
// this script:
//   1. reads the report table (title, size, language, upload date, PDF link),
//   2. downloads every PDF into public/documents/flood/<year>/ (skips files that
//      already exist, so re-running only fetches new reports),
//   3. regenerates src/data/floodReportsArchive.generated.js, which the
//      Flood Reports page uses for its year-wise archive — so no visitor is ever
//      sent to the legacy website for an old report.
//
// Usage: node scripts/flood-archive.mjs            (scan + download + generate)
//        node scripts/flood-archive.mjs --no-download   (offline: regenerate from
//                                                        already-downloaded files)
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = join(repoRoot, "public", "documents", "flood");
const GENERATED = join(repoRoot, "src", "data", "floodReportsArchive.generated.js");
const BASE = "https://rsac.up.gov.in";
const FIRST_YEAR = 2016;
const noDownload = process.argv.includes("--no-download");

const decode = (s) =>
  s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

const sanitize = (name) =>
  decodeURIComponent(name).replace(/[^\w.()-]+/g, "_").replace(/_{2,}/g, "_").replace(/^_+|_+$/g, "");

// The legacy site rarely has broken hrefs with two URLs glued together
// ("...A.pdfsite/writereaddata/...B.pdf"); keep only the second, complete one.
const repairHref = (href) => {
  const glued = href.match(/\.pdf(site\/writereaddata\/.*\.pdf)$/i);
  return glued ? glued[1] : href;
};

const scanYear = async (year) => {
  const res = await fetch(`${BASE}/en/page/flood-${year}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const html = (await res.text()).replace(/\r?\n/g, " ");
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const entries = [];
  for (const row of rows) {
    const size = row.match(/Size\s*:?\s*([\d.]+)\s*KB/i);
    const lang = row.match(/Language\s*:\s*([A-Za-z]+)/i);
    const date = row.match(/Upload Date\s*:\s*([\d/.-]+)/i);
    const href = row.match(/<a[^>]*href="([^"]+\.pdf)"/i);
    if (!size || !href) continue;
    const cell = row.match(/<td[^>]*>((?:(?!<\/td>).)*?)(?:<br[^>]*>|<span[^>]*class="pdf-size")/i);
    const title = decode(cell ? cell[1] : "").replace(/\s*Size.*$/i, "");
    if (!title) continue;
    const repaired = repairHref(href[1]);
    entries.push({
      title,
      language: lang ? lang[1] : "English",
      uploadDate: date ? date[1].trim() : "",
      url: repaired.startsWith("http") ? repaired : `${BASE}/${repaired.replace(/^\.?\//, "")}`,
    });
  }
  return entries;
};

const download = async (url, file) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(encodeURI(decodeURI(url)), { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tmp = `${file}.part`;
      await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
      if (statSync(tmp).size < 500) { unlinkSync(tmp); throw new Error("file too small"); }
      renameSync(tmp, file);
      return true;
    } catch (error) {
      if (attempt === 3) { console.warn(`  FAILED ${url}: ${error.message}`); return false; }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return false;
};

// Report date: prefer the upload timestamp embedded in the server file name
// (YYYYMMDDhhmm...); otherwise parse the displayed date, preferring the reading
// whose month falls in the monsoon season; clamp to the archive year.
const deriveDate = (entry, year) => {
  const stamp = entry.url.match(/\/(\d{12,14})[^/]*\.pdf$/i);
  if (stamp) {
    const [y, mo, d] = [stamp[1].slice(0, 4), stamp[1].slice(4, 6), stamp[1].slice(6, 8)];
    if (Number(y) === year) return `${y}-${mo}-${d}`;
  }
  const parts = (entry.uploadDate || "").split(/[/.-]/).map(Number);
  if (parts.length === 3) {
    let [a, b] = parts;
    let day = a, month = b; // Indian DD/MM by default
    if (a <= 12 && (b > 12 || (b >= 6 && b <= 11 && (a < 6 || a > 11)))) { day = b; month = a; }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return `${year}-01-01`;
};

const labelFor = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const classify = (title) => {
  const t = title.trim();
  if (/\bUP\b|U\.P\.|STATE|FLOOD LIST|UPFLOOD/i.test(t) || /uttar pradesh/i.test(t)) {
    return { category: "Daily Report", coverage: "State-wide" };
  }
  const words = t.split(/\s+/);
  if (words.length <= 3 && /^[A-Za-z_ .()-]+$/.test(t)) {
    const district = t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    return { category: "District Report", coverage: district };
  }
  return { category: "Daily Report", coverage: "Uttar Pradesh" };
};

const main = async () => {
  const currentYear = new Date().getFullYear();
  const byYear = {};

  for (let year = FIRST_YEAR; year <= currentYear; year += 1) {
    const dir = join(OUT_ROOT, String(year));
    let entries = null;
    if (!noDownload) {
      try { entries = await scanYear(year); } catch { entries = null; }
    }

    if (!entries || !entries.length) {
      // Offline / page gone: keep whatever is already on disk (bare listing).
      if (!existsSync(dir)) continue;
      entries = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => ({
        title: f.replace(/^\d{12,}/, "").replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || f,
        language: "English",
        uploadDate: "",
        url: `${BASE}/placeholder/${f}`,
        localFile: f,
      }));
      if (!entries.length) continue;
      console.log(`${year}: offline, listed ${entries.length} local PDFs`);
    } else {
      mkdirSync(dir, { recursive: true });
      const seen = new Map();
      let fetched = 0, present = 0, failed = 0;
      for (const entry of entries) {
        let base = sanitize(entry.url.split("/").pop());
        if (!base.toLowerCase().endsWith(".pdf")) base += ".pdf";
        const n = seen.get(base) || 0;
        seen.set(base, n + 1);
        if (n > 0) base = base.replace(/\.pdf$/i, `-${n + 1}.pdf`);
        entry.localFile = base;
        const file = join(dir, base);
        if (existsSync(file) && statSync(file).size > 500) { present += 1; continue; }
        (await download(entry.url, file)) ? (fetched += 1) : (failed += 1);
      }
      console.log(`${year}: ${entries.length} reports (${present} already local, ${fetched} downloaded${failed ? `, ${failed} FAILED` : ""})`);
      // Drop entries whose PDF could not be fetched; never link to the legacy site.
      entries = entries.filter((e) => existsSync(join(dir, e.localFile)) && statSync(join(dir, e.localFile)).size > 500);
    }

    const reports = entries.map((entry, index) => {
      const date = deriveDate(entry, year);
      const { category, coverage } = classify(entry.title);
      return {
        id: `fr-archive-${year}-${index + 1}`,
        title: entry.title,
        date,
        dateLabel: labelFor(date),
        category,
        coverage,
        meta: `PDF | ${entry.language || "English"}`,
        url: `/documents/flood/${year}/${entry.localFile}`,
      };
    });
    reports.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    if (reports.length) byYear[year] = reports;
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const banner = `// GENERATED by scripts/flood-archive.mjs — do not edit by hand.
// Local mirror of the official year-wise flood report archive
// (PDFs live in public/documents/flood/<year>/). Re-run the script to add a
// new season or newly published reports.
`;
  const body = `${banner}
export const floodArchiveYears = ${JSON.stringify(years)};

export const floodReportsByYear = ${JSON.stringify(byYear)};
`;
  writeFileSync(GENERATED, body);
  const total = years.reduce((n, y) => n + byYear[y].length, 0);
  console.log(`\nWrote ${GENERATED.replace(/\\/g, "/")} — ${total} reports across ${years.length} year(s): ${years.join(", ")}`);
};

main().catch((error) => { console.error(error); process.exit(1); });
