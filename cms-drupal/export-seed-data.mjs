import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { rsacOfficialSections as officialSectionsEn } from "../src/data/rsacOfficialContent.generated.js";
import { rsacOfficialSections as officialSectionsHi } from "../src/data/rsacOfficialContent.hi.generated.js";
import { divisions, facilities, contactDetails } from "../src/data/siteContent.js";
import { notices } from "../src/data/notices.js";
import { floodReports } from "../src/data/floodReports.js";
import { galleryImages } from "../src/data/gallery.js";
import { menuItems } from "../src/data/menuItems.js";
import { mobileApps } from "../src/data/mobileApps.js";
import { quickLinks } from "../src/data/quickLinks.js";
import { geoportals } from "../src/data/geoportals.js";
import { formerProfiles } from "../src/data/formerProfiles.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const stripFunctions = (items) =>
  items.map((item) =>
    Object.fromEntries(
      Object.entries(item).filter(([, value]) => typeof value !== "function")
    )
  );

const extractArray = async (relativePath, exportName, helpers = {}) => {
  const source = await readFile(join(root, relativePath), "utf8");
  const marker = `export const ${exportName} =`;
  const start = source.indexOf(marker);
  if (start === -1) {
    return [];
  }

  const arrayStart = source.indexOf("[", start);
  let depth = 0;
  let end = arrayStart;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      end += 1;
      break;
    }
  }

  const arraySource = source.slice(arrayStart, end);
  const helperNames = Object.keys(helpers);
  const helperValues = Object.values(helpers);
  return Function(...helperNames, `return (${arraySource});`)(...helperValues);
};

const scientistImage = (fileName) => `/scientists/${fileName}`;
const scientistProfiles = await extractArray("src/data/people.js", "scientistProfiles", {
  scientistImage,
});
const technicalProfiles = await extractArray("src/data/people.js", "technicalProfiles", {
  scientistImage,
});
const administrationProfiles = await extractArray(
  "src/data/people.js",
  "administrationProfiles",
  { scientistImage }
);

const data = {
  officialSections: {
    en: officialSectionsEn,
    hi: officialSectionsHi,
  },
  divisions,
  facilities,
  contactDetails,
  notices,
  floodReports,
  galleryImages,
  menuItems,
  mobileApps,
  quickLinks,
  geoportals: stripFunctions(geoportals),
  profiles: [
    ...scientistProfiles.map((item) => ({ ...item, profileType: "scientist" })),
    ...technicalProfiles.map((item) => ({ ...item, profileType: "technical" })),
    ...administrationProfiles.map((item) => ({
      ...item,
      profileType: "administration",
    })),
    ...formerProfiles.map((item) => ({ ...item, profileType: "former" })),
  ],
};

await writeFile(
  join(here, "seed-data.generated.json"),
  `${JSON.stringify(data, null, 2)}\n`,
  "utf8"
);

console.log("Drupal seed data exported.");
