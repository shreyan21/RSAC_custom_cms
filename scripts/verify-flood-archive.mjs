import { open, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  floodArchiveYears,
  floodReportsByYear,
} from "../src/data/floodReportsArchive.generated.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(repoRoot, "public");
const archiveRoot = resolve(publicRoot, "documents", "flood");
const failures = [];
let checked = 0;

for (const year of floodArchiveYears) {
  const reports = floodReportsByYear[year] || [];
  if (!reports.length) failures.push(`${year}: no indexed reports`);

  for (const report of reports) {
    const url = String(report.url || "");
    if (!url.startsWith(`/documents/flood/${year}/`)) {
      failures.push(`${year}: invalid local URL ${url || "(blank)"}`);
      continue;
    }

    const filePath = resolve(publicRoot, url.replace(/^\/+/, ""));
    if (!filePath.startsWith(`${archiveRoot}${sep}`)) {
      failures.push(`${year}: unsafe archive path ${url}`);
      continue;
    }

    try {
      const details = await stat(filePath);
      if (!details.isFile() || details.size < 500) {
        failures.push(`${year}: empty or invalid PDF ${url}`);
        continue;
      }

      const handle = await open(filePath, "r");
      try {
        const signature = Buffer.alloc(5);
        await handle.read(signature, 0, signature.length, 0);
        if (signature.toString("ascii") !== "%PDF-") {
          failures.push(`${year}: file is not a PDF ${url}`);
          continue;
        }
      } finally {
        await handle.close();
      }
      checked += 1;
    } catch (error) {
      failures.push(`${year}: missing ${url} (${error.code || error.message})`);
    }
  }
}

if (failures.length) {
  console.error(`Flood archive check failed with ${failures.length} problem(s):`);
  failures.slice(0, 30).forEach((failure) => console.error(`- ${failure}`));
  if (failures.length > 30) console.error(`- ...and ${failures.length - 30} more`);
  process.exit(1);
}

console.log(`Flood archive check passed: ${checked} local PDFs across ${floodArchiveYears.length} years.`);
