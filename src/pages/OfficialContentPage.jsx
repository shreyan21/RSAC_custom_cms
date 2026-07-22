import { handleNestedWheel } from "../utils/nestedScroll";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Building2,
  Cpu,
  Database,
  Droplets,
  FileText,
  FlaskConical,
  GraduationCap,
  Landmark,
  MapIcon,
  Mountain,
  Printer,
  Satellite,
  ScanLine,
  Sprout,
  Trees,
  UserRound,
  Waves,
  Wrench,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import Lightbox from "../components/media/Lightbox";
import BackButton from "../components/navigation/BackButton";
import {
  useRsacOfficialSections,
  useDivisions,
  useFormerProfiles,
  useScientistProfiles,
  useSiteSettings,
} from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";
import { scrollToTarget } from "../utils/scroll";
import { getUiLabelOverride } from "../data/uiLabels";
import {
  isUnmirroredLegacyMedia,
  rewriteOfficialMedia,
} from "../data/officialMedia";
import { sectionOverrideKey } from "../data/contentUtils";
import { removeLegacyImportedTabStrips } from "../data/importedHtmlCleanup";
import {
  canonicalDivisionSection,
  divisionSectionFamily,
} from "../data/divisionSectionLabels";
import {
  appendNewPageAssets,
  applyPageAssetFields,
  flattenPageAssetFields,
} from "../data/pageAssetFields";
import {
  applyPageTextFields,
  extractPageTextFields,
  flattenImportedPageTextFields,
  sanitizeInlineRichText,
} from "../data/pageTextFields";
import { SHOW_BREADCRUMBS } from "../config/uiConfig";

const localizeOfficialText = (text) =>
  typeof text === "string" ? getUiLabelOverride(text) || text : text;

const OfficialContentLoading = () => {
  const { t } = useLanguage();

  return (
    <PageShell
      eyebrow={t("Loading Official Records")}
      title={t("Preparing page content")}
      intro={t("Please wait while the selected section is loaded.")}
      density="compact"
    >
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600 shadow-[0_16px_48px_rgba(18,50,74,0.06)]"
        aria-live="polite"
        aria-busy="true"
      >
        {t("Please wait while the selected section is loaded.")}
      </div>
    </PageShell>
  );
};

const getPagePath = (section, page) => {
  if (section.key === "about-us" && page.slug === "organisational-chart") {
    return "/organisation-chart";
  }

  return `/${section.route}/${page.slug}`;
};

const profilePageSlugs = new Set([
  "scientific-manpower",
  "our-former",
  "our-chairman's-governing-body",
  "director's",
]);

const staticProfilePageSlugs = new Set([
  "our-chairman's-governing-body",
  "director's",
]);

const formerPages = [
  "our-chairman's-governing-body",
  "director's",
  "our-former",
];

const formerSectionDefinitions = [
  {
    slug: "our-chairman's-governing-body",
    id: "chairman-governing-body",
    title: "Former Chairmen, Governing Body",
    intro: "Former chairpersons and their tenure periods.",
    mode: "static",
  },
  {
    slug: "director's",
    id: "directors",
    title: "Former Directors",
    intro: "Former directors and their tenure periods.",
    mode: "static",
  },
  {
    slug: "our-former",
    id: "former-scientists",
    title: "Former Scientists",
    intro: "Former scientist profiles with service and domain details.",
    mode: "flip",
  },
];

const officialCardThemes = [
  {
    matcher: /lidar|bathymetry|sonar|point-cloud/i,
    label: "LiDAR and Bathymetry",
    icon: ScanLine,
    accent: "#075985",
    accent2: "#0f766e",
    texture:
      "linear-gradient(145deg, rgba(7, 89, 133, 0.92), rgba(15, 118, 110, 0.7)), repeating-radial-gradient(circle at 74% 56%, rgba(255,255,255,0.2) 0 2px, transparent 2px 13px)",
  },
  {
    matcher: /water analysis|water-quality laboratory/i,
    label: "Water Analysis Laboratory",
    icon: FlaskConical,
    accent: "#0369a1",
    accent2: "#14b8a6",
    texture:
      "linear-gradient(145deg, rgba(3, 105, 161, 0.92), rgba(20, 184, 166, 0.68)), radial-gradient(circle at 78% 28%, rgba(255,255,255,0.25) 0 4px, transparent 5px), radial-gradient(circle at 68% 62%, rgba(255,255,255,0.16) 0 7px, transparent 8px)",
  },
  {
    matcher: /soil analysis|soil laboratory/i,
    label: "Soil Analysis Laboratory",
    icon: FlaskConical,
    accent: "#7c4a24",
    accent2: "#6b8e23",
    texture:
      "linear-gradient(180deg, rgba(107, 142, 35, 0.82) 0 24%, rgba(124, 74, 36, 0.92) 25% 100%), repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 18px)",
  },
  {
    matcher: /library|books|journals|opac/i,
    label: "Library and Knowledge",
    icon: BookOpen,
    accent: "#7c3e18",
    accent2: "#b78a35",
    texture:
      "linear-gradient(135deg, rgba(124, 62, 24, 0.92), rgba(183, 138, 53, 0.72)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 3px, transparent 3px 24px)",
  },
  {
    matcher: /cartography|reprography|reprographic|printing|lamination/i,
    label: "Cartography and Reprography",
    icon: Printer,
    accent: "#344f72",
    accent2: "#c07c2f",
    texture:
      "linear-gradient(135deg, rgba(52, 79, 114, 0.92), rgba(192, 124, 47, 0.68)), repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 16px)",
  },
  {
    matcher: /training hostel|hostels|guest|trainees/i,
    label: "Training Hostel",
    icon: BedDouble,
    accent: "#6b4e8a",
    accent2: "#b56b39",
    texture:
      "linear-gradient(135deg, rgba(107, 78, 138, 0.9), rgba(181, 107, 57, 0.68)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 28px)",
  },
  {
    matcher: /service block|backup power|transformer|dg set|ups|pump infrastructure/i,
    label: "Service Infrastructure",
    icon: Building2,
    accent: "#475569",
    accent2: "#c26c23",
    texture:
      "linear-gradient(135deg, rgba(71, 85, 105, 0.94), rgba(194, 108, 35, 0.68)), repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 18px), repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 18px)",
  },
  {
    matcher: /technical cell|activity monitoring|institutional documentation/i,
    label: "Technical Coordination",
    icon: Wrench,
    accent: "#334155",
    accent2: "#0f766e",
    texture:
      "linear-gradient(135deg, rgba(51, 65, 85, 0.94), rgba(15, 118, 110, 0.68)), repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 18px)",
  },
  {
    matcher: /agriculture|crop|horticulture|farm/i,
    label: "Agriculture Resources",
    icon: Sprout,
    accent: "#138808",
    accent2: "#ffb547",
    texture:
      "linear-gradient(135deg, rgba(22, 111, 63, 0.88), rgba(198, 167, 79, 0.72)), repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(6, 59, 38, 0.18) 0 2px, transparent 2px 24px)",
  },
  {
    matcher: /computer|image processing|software|it infrastructure/i,
    label: "Computer Image Processing",
    icon: Cpu,
    accent: "#0b6fa4",
    accent2: "#16a3a6",
    texture:
      "linear-gradient(135deg, rgba(10, 70, 104, 0.9), rgba(10, 134, 126, 0.72)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 14px), repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 18px)",
  },
  {
    // `(?<![a-z])geomorphology` so groundwater's "hydrogeomorphology" (and other
    // compounds) don't get pulled into the Earth theme; standalone Geomorphology
    // still matches.
    matcher: /earth resources|(?<![a-z])geomorphology|lineament|landslide/i,
    label: "Earth Resources",
    icon: Mountain,
    accent: "#9a6a2f",
    accent2: "#1f7a63",
    texture:
      "linear-gradient(135deg, rgba(149, 102, 47, 0.86), rgba(38, 118, 94, 0.68)), repeating-linear-gradient(160deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 18px), repeating-linear-gradient(25deg, rgba(32, 62, 49, 0.18) 0 1px, transparent 1px 22px)",
  },
  {
    matcher: /forest|ecology|biodiversity|wildlife/i,
    label: "Forest Resources",
    icon: Trees,
    accent: "#0f6f42",
    accent2: "#4f9d4e",
    texture:
      "linear-gradient(135deg, rgba(9, 89, 55, 0.9), rgba(84, 132, 70, 0.76)), repeating-linear-gradient(125deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 18px), repeating-linear-gradient(35deg, rgba(4, 48, 31, 0.2) 0 1px, transparent 1px 20px)",
  },
  {
    matcher: /groundwater|ground water|aquifer/i,
    label: "Groundwater Resources",
    icon: Droplets,
    accent: "#087ea4",
    accent2: "#a8793d",
    texture:
      "linear-gradient(180deg, rgba(12, 125, 158, 0.86), rgba(168, 121, 61, 0.62)), repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0 2px, transparent 2px 17px), repeating-linear-gradient(90deg, rgba(5, 63, 88, 0.18) 0 1px, transparent 1px 26px)",
  },
  {
    // Checked before Geo-Spatial: the School of Geoinformatics summary mentions
    // "GIS" (which the data-bank matcher also claims), so ordering this first
    // gives geoinformatics content its own map-graticule identity.
    matcher: /geoinformatic|geo[-\s]?informatics?|remote sensing and gis/i,
    label: "Geoinformatics",
    icon: Satellite,
    accent: "#4338ca",
    accent2: "#0891b2",
    texture:
      "linear-gradient(135deg, rgba(67, 56, 202, 0.86), rgba(8, 145, 178, 0.72)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 20px), repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 20px)",
  },
  {
    matcher: /geo-?spatial|data bank|gis|geospatial|database/i,
    label: "Geo-Spatial Data Bank",
    icon: Database,
    accent: "#0b6fa4",
    accent2: "#0f6f42",
    texture:
      "linear-gradient(135deg, rgba(11, 111, 164, 0.86), rgba(15, 111, 66, 0.72)), repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 1px, transparent 1px 20px), repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 20px)",
  },
  {
    matcher: /landuse|land use|urban|settlement|planning/i,
    label: "Landuse and Urban Survey",
    icon: MapIcon,
    accent: "#2f5f8f",
    accent2: "#d38b2e",
    texture:
      "linear-gradient(135deg, rgba(47, 95, 143, 0.86), rgba(211, 139, 46, 0.62)), repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 28px), repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 18px)",
  },
  {
    matcher: /soil|sodic|fertility|wasteland/i,
    label: "Soil Resources",
    icon: Sprout,
    accent: "#8a5a2b",
    accent2: "#c07f3a",
    texture:
      "linear-gradient(180deg, rgba(124, 76, 35, 0.9), rgba(193, 127, 58, 0.7)), repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 19px), repeating-linear-gradient(160deg, rgba(82, 48, 24, 0.2) 0 1px, transparent 1px 24px)",
  },
  {
    matcher: /surface water|river|flood|water resources|wetland/i,
    label: "Surface Water Resources",
    icon: Waves,
    accent: "#0b6fa4",
    accent2: "#35a4c7",
    texture:
      "linear-gradient(135deg, rgba(7, 105, 164, 0.9), rgba(53, 164, 199, 0.72)), repeating-linear-gradient(150deg, rgba(255,255,255,0.22) 0 2px, transparent 2px 18px), repeating-linear-gradient(20deg, rgba(5, 54, 90, 0.16) 0 1px, transparent 1px 24px)",
  },
  {
    matcher: /training|school|academic|m\.?tech|student|thesis/i,
    label: "Training and Academics",
    icon: GraduationCap,
    accent: "#7057a8",
    accent2: "#0b6fa4",
    texture:
      "linear-gradient(135deg, rgba(95, 76, 156, 0.86), rgba(11, 111, 164, 0.7)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 24px)",
  },
  {
    matcher: /facility|library|lab|equipment|hardware|building|hostel/i,
    label: "Facilities",
    icon: Landmark,
    accent: "#7a4f2a",
    accent2: "#0f6f42",
    texture:
      "linear-gradient(135deg, rgba(122, 79, 42, 0.86), rgba(15, 111, 66, 0.66)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 20px)",
  },
  {
    matcher: /former|scientist|director|chairman|leadership|manpower/i,
    label: "People Records",
    icon: UserRound,
    accent: "#12324a",
    accent2: "#0b6fa4",
    texture:
      "linear-gradient(135deg, rgba(18, 50, 74, 0.9), rgba(11, 111, 164, 0.68)), repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(255,255,255,0.11) 0 1px, transparent 1px 22px)",
  },
];

const defaultOfficialCardTheme = {
  label: "Official Content",
  icon: Satellite,
  accent: "#0b6fa4",
  accent2: "#0f6f42",
  texture:
    "linear-gradient(135deg, rgba(11, 111, 164, 0.86), rgba(15, 111, 66, 0.68)), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 20px), repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 20px)",
};

// Editors pick these by name in custom CMS page fields.
const officialCardIconChoices = {
  "bed-double": BedDouble,
  "book-open": BookOpen,
  building: Building2,
  sprout: Sprout,
  cpu: Cpu,
  mountain: Mountain,
  trees: Trees,
  droplets: Droplets,
  database: Database,
  map: MapIcon,
  waves: Waves,
  "graduation-cap": GraduationCap,
  landmark: Landmark,
  "user-round": UserRound,
  satellite: Satellite,
  "flask-conical": FlaskConical,
  printer: Printer,
  "scan-line": ScanLine,
  wrench: Wrench,
  "file-text": FileText,
};

const hexToRgba = (hex, alpha) => {
  const value = String(hex || "").trim().replace(/^#/, "");
  const size = value.length === 3 ? 1 : 2;
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(value)) {
    return "";
  }
  const channel = (index) =>
    parseInt(value.slice(index * size, index * size + size).repeat(3 - size), 16);
  return `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha})`;
};

const getOfficialCardTheme = (section, page) => {
  // Slugs and section keys keep their English words in every language, so the
  // Hindi site resolves the SAME icon/color theme as the English site even
  // though titles/summaries are Devanagari there.
  const searchableText = `${section?.key || ""} ${String(
    page?.slug || ""
  ).replace(/-/g, " ")} ${page?.baseTitle || ""} ${page?.baseSummary || ""} ${
    section?.title || ""
  } ${page?.title || ""} ${page?.summary || page?.preview || ""}`;

  const theme =
    officialCardThemes.find((item) => item.matcher.test(searchableText)) ||
    defaultOfficialCardTheme;

  // CMS overrides from Website Pages: editor-picked icon and card colors win
  // over the automatic theme; the texture is rebuilt from the custom colors so
  // the whole card header follows them.
  const cmsIcon = officialCardIconChoices[String(page?.cardIcon || "").trim()];
  const cardColor = page?.cardColor || page?.cardAccent;
  const cardColor2 = page?.cardColor2 || page?.cardAccent2;
  const accent = hexToRgba(cardColor, 1) ? cardColor : "";
  const accent2 = hexToRgba(cardColor2, 1) ? cardColor2 : "";

  if (!cmsIcon && !accent && !accent2) {
    return theme;
  }

  const mergedAccent = accent || theme.accent;
  const mergedAccent2 = accent2 || theme.accent2;

  return {
    ...theme,
    icon: cmsIcon || theme.icon,
    accent: mergedAccent,
    accent2: mergedAccent2,
    texture:
      accent || accent2
        ? `linear-gradient(135deg, ${hexToRgba(mergedAccent, 0.88)}, ${hexToRgba(
            mergedAccent2,
            0.72
          )}), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 18px), repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 20px)`
        : theme.texture,
  };
};

const getOfficialCardStyle = (theme) => ({
  "--official-card-accent": theme.accent,
  "--official-card-accent-2": theme.accent2,
  "--official-card-texture": theme.texture,
});

const getOfficialCardThemeKey = (theme) =>
  String(theme?.label || "official-content")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");



// Aliases include the official RSAC Hindi tab/section labels so the layout
// engine builds the SAME tabs / sections / left-column nav from a Hindi body.
const divisionCategoryDefinitions = [
  {
    key: "scientific-manpower",
    label: "Scientific Manpower",
    aliases: ["scientific manpower", "वैज्ञानिक जनशक्ति"],
  },
  {
    key: "ongoing-projects",
    label: "Ongoing Projects",
    aliases: [
      "ongoing project",
      "ongoing projects",
      "ongoing scientific projects",
      "brief details of ongoing projects",
      "चालू परियोजनाएं",
      "चालू परियोजनाएँ",
      "चल रही परियोजना",
      "चल रही परियोजनाएँ",
      "चल रही वैज्ञानिक परियोजनाएं",
      "चल रही वैज्ञानिक परियोजनाएँ",
      "संचालित परियोजनायें",
      "संचालित परियोजनाएँ",
    ],
  },
  {
    key: "completed-projects",
    label: "Completed Projects",
    aliases: [
      "completed project",
      "completed projects",
      "completed involved projects",
      "completed/involved projects",
      "पूर्ण परियोजनाएं",
      "पूर्ण परियोजनाएँ",
      "पूर्ण की गयी परियोजनायें",
      "पूर्ण की गई परियोजनाएँ",
      "पूर्ण/संलग्न परियोजनाएँ",
      "पूर्ण/संलग्न परियोजनाएं",
      "पूर्ण/सम्मिलित परियोजनाएँ",
      "पूर्ण / सम्मिलित परियोजनाएँ",
    ],
  },
  {
    key: "technical-reports",
    label: "Technical Reports",
    aliases: [
      "technical reports",
      "technical reports and atlas",
      "technical reports and atlases",
      "list of technical reports",
      "list of technical reports disaster management plans atlases",
      "तकनीकी रिपोर्ट",
      "तकनीकि रिपोर्ट",
      "तकनीकी रिपोर्ट एवं एटलस",
    ],
  },
  {
    key: "publications",
    label: "Publications",
    aliases: ["publication", "publications", "प्रकाशन"],
  },
  {
    key: "research-paper-published",
    label: "Research Paper Published",
    aliases: [
      "book chapters published from international publisher",
      "book/chapters published from international publisher",
      "list of research papers",
      "research paper published",
      "research papers published",
      "research paper presented published",
      "research paper presented/published",
      "शोध पत्र प्रकाशित",
      "शोध पत्र प्रस्तुत प्रकाशित",
    ],
  },
  {
    key: "research-papers",
    label: "Research Paper/ Articles",
    aliases: [
      "research paper",
      "research papers",
      "research paper articles",
      "research paper/articles",
      "research paper articals",
      "research paper/articals",
      "शोध पत्र",
      "शोध पत्र / लेख",
      "शोध पत्र/लेख",
      "शोध पत्र / आलेख",
      "शोध प्रपत्र",
    ],
  },
  {
    key: "map-photos",
    label: "Map/Photos",
    aliases: [
      "map photos",
      "map/photos",
      "map/ photos",
      "maps photos",
      "मानचित्र / तस्वीरें",
      "मानचित्र/तस्वीरें",
      "मानचित्र तस्वीरें",
      "नक्शे / तस्वीरें",
    ],
  },
  {
    key: "software",
    label: "Software",
    aliases: ["software", "सॉफ्टवेयर", "सॉफ्टवेर"],
  },
  {
    key: "hardware",
    label: "Hardware",
    aliases: ["hardware", "हार्डवेयर"],
  },
  {
    key: "data-bank",
    label: "Data Bank",
    aliases: ["data bank", "डेटा बैंक", "डाटा बैंक"],
  },
  {
    key: "training-programmes",
    label: "Training Programmes",
    aliases: [
      "training programme",
      "training programmes",
      "training program",
      "प्रशिक्षण कार्यक्रम",
    ],
  },
  {
    key: "training-hostel",
    label: "Training Hostel",
    aliases: ["training hostel", "प्रशिक्षण छात्रावास"],
  },
  {
    key: "training-hostel-photos",
    label: "Training Hostel Photos",
    aliases: ["training hostel photos", "प्रशिक्षण छात्रावास तस्वीरें"],
  },
  {
    key: "mtech",
    label: "M.Tech. in Remote Sensing and GIS",
    aliases: [
      "m tech in remote sensing and gis",
      "m.tech. in remote sensing and gis",
      "रिमोट सेंसिंग एवं जीआईएस में एम.टेक.",
    ],
  },
];

const compactText = (value) =>
  value
    ?.replace(/\s+/g, " ")
    .replace(/^×\s*/, "")
    .replace(/\s*Close\s*$/i, "")
    .trim() || "";

const normalizeName = (value) =>
  compactText(value)
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();

const normalizeEquivalentHonorifics = (value) =>
  normalizeName(
    compactText(value)
      .replace(/^(?:mr\.?|shri|sri)\s+/i, "shri ")
      .replace(/^(?:mrs\.?|smt)\s+/i, "smt ")
  );

const getScientistProfileData = (scientistProfiles) => scientistProfiles || [];

// Active-scientist identity by name, language-robust. The scientific-manpower
// page is filtered to the active roster by name, but the two sides can disagree
// on language: the scraped page.html carries English names while the CMS roster
// (in Hindi mode) carries Devanagari — so neither side alone covers both. Always
// union the English roster name plus its official Hindi rendering, drawn from
// both the supplied profiles and the static roster, so an English OR Devanagari
// heading both match and the page never falls back to the raw HTML dump.
const getActiveScientistNames = (scientistProfiles) => {
  const names = new Set();
  const add = (value) => {
    const normalized = normalizeName(value);
    if (normalized) {
      names.add(normalized);
    }
  };

  for (const profile of getScientistProfileData(scientistProfiles)) {
    add(profile.name);
  }

  return names;
};

const normalizeLabel = (value) =>
  compactText(value)
    .replace(/[\s:._-]+/g, "")
    .toLowerCase();

// Imported profile tables use many English and Hindi spellings for the same
// field. Canonical keys let the CMS roster replace incomplete or duplicated
// table rows without depending on the visible label language.
const profileDetailLabelGroups = [
  {
    key: "duration",
    aliases: [
      "duration", "tenure", "time period", "time limit",
      "अवधि", "कार्यकाल", "समय अवधि", "समयावधि", "समय सीमा",
    ],
  },
  {
    key: "employeeid",
    aliases: ["employee id", "emp id", "कर्मचारी आईडी"],
  },
  {
    key: "designation",
    aliases: [
      "designation", "present designation", "current designation",
      "पदनाम", "पद का नाम", "वर्तमान पद",
    ],
  },
  {
    key: "qualification",
    aliases: [
      "qualification", "educational qualification", "academic qualification",
      "योग्यता", "शैक्षणिक योग्यता", "शैक्षिक योग्यता",
    ],
  },
  {
    key: "deployment",
    aliases: [
      "deployment", "division", "posting",
      "तैनाती", "नियुक्ति",
    ],
  },
  {
    key: "specialization",
    aliases: [
      "specialization", "specialisation", "area of specialization",
      "area of specialisation", "विशेषज्ञता", "विशेषज्ञता का क्षेत्र",
    ],
  },
  {
    key: "experience",
    aliases: [
      "experience", "professional experience", "experience in years",
      "अनुभव", "पेशेवर अनुभव",
    ],
  },
  {
    key: "publications",
    aliases: [
      "publication", "publications", "number of publications",
      "no of publications", "प्रकाशन", "प्रकाशनों की संख्या",
    ],
  },
  {
    key: "contact",
    aliases: ["contact", "contact no", "contact number", "संपर्क", "संपर्क संख्या"],
  },
  {
    key: "email",
    aliases: ["email", "email id", "e-mail", "e-mail id", "ई-मेल", "ईमेल", "ईमेल आईडी"],
  },
];

const canonicalProfileDetailLabel = (label) => {
  const normalized = normalizeLabel(label);
  const group = profileDetailLabelGroups.find(({ aliases }) =>
    aliases.some((alias) => normalized.includes(normalizeLabel(alias)))
  );

  return group?.key || normalized;
};

const profileDetailOrder = [
  "designation",
  "qualification",
  "deployment",
  "specialization",
  "experience",
  "publications",
  "contact",
  "email",
  "employeeid",
  "duration",
];

const mergeProfileDetailRows = (...detailGroups) => {
  const merged = new Map();

  detailGroups.flat().filter(Boolean).forEach((detail) => {
    if (!detail?.label || !detail?.value) return;
    const key = canonicalProfileDetailLabel(detail.label);
    if (!merged.has(key)) merged.set(key, detail);
  });

  return Array.from(merged.entries())
    .map(([key, detail], index) => ({ key, detail, index }))
    .sort((left, right) => {
      const leftRank = profileDetailOrder.indexOf(left.key);
      const rightRank = profileDetailOrder.indexOf(right.key);
      const normalizedLeftRank = leftRank < 0 ? Number.MAX_SAFE_INTEGER : leftRank;
      const normalizedRightRank = rightRank < 0 ? Number.MAX_SAFE_INTEGER : rightRank;
      return normalizedLeftRank - normalizedRightRank || left.index - right.index;
    })
    .map(({ detail }) => detail);
};

const normalizeCategoryText = (value) =>
  compactText(value)
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/articals/gi, "articles")
    .replace(/\s*\/\s*/g, "/")
    // Keep Devanagari (U+0900-U+097F) so Hindi tab/section labels survive and
    // can match the Hindi aliases below.
    .replace(/[^a-z0-9/&.\p{Script=Devanagari}]+/giu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const canonicalizeDivisionCategory = (value) => {
  const normalized = normalizeCategoryText(value);

  if (!normalized) {
    return null;
  }

  return (
    divisionCategoryDefinitions.find((category) =>
      category.aliases.some((alias) => {
        const normalizedAlias = normalizeCategoryText(alias);
        return (
          normalized === normalizedAlias ||
          normalized.includes(normalizedAlias) ||
          normalizedAlias.includes(normalized)
        );
      })
    ) || null
  );
};

const uniqueCategories = (categories) => {
  const seen = new Set();

  return categories.filter((category) => {
    if (!category || seen.has(category.key)) {
      return false;
    }

    seen.add(category.key);
    return true;
  });
};

const uniqueDivisionSections = (sections) => {
  const seen = new Set();

  return sections.filter((section) => {
    if (!section?.key || seen.has(section.key)) {
      return false;
    }

    seen.add(section.key);
    return true;
  });
};

const getProfileName = (profile) =>
  compactText(
    profile.name ||
      profile.title?.rendered ||
      profile.title ||
      profile.acf?.name ||
      "Profile"
  );

const getProfileDurationValue = (profile) =>
  compactText(
    profile.duration ||
      profile.tenure ||
      profile.timePeriod ||
      profile.time_period ||
      profile.acf?.duration ||
      profile.acf?.tenure ||
      profile.acf?.timePeriod ||
      profile.acf?.time_period ||
      ""
  );

const getProfileDetails = (profile) => {
  const durationValue = getProfileDurationValue(profile);

  if (Array.isArray(profile.details)) {
    const details = profile.details
      .map((detail) =>
        typeof detail === "string"
          ? { label: "Detail", value: detail }
          : detail
      )
      .filter((detail) => detail?.label && detail?.value);
    const hasDuration = details.some((detail) =>
      ["duration", "tenure", "timeperiod"].some((label) =>
        normalizeLabel(detail.label).includes(label)
      )
    );

    return durationValue && !hasDuration
      ? [{ label: "Duration", value: durationValue }, ...details]
      : details;
  }

  return [
    durationValue ? { label: "Duration", value: durationValue } : null,
    profile.employeeId || profile.employee_id
      ? { label: "Employee Id", value: profile.employeeId || profile.employee_id }
      : null,
    profile.designation
      ? { label: "Designation", value: profile.designation }
      : null,
    profile.qualification
      ? { label: "Qualification", value: profile.qualification }
      : null,
    profile.deployment
      ? { label: "Deployment", value: profile.deployment }
      : null,
    profile.specialization
      ? { label: "Area of Specialization", value: profile.specialization }
      : null,
    profile.experience
      ? { label: "Experience", value: profile.experience }
      : null,
    profile.publications
      ? { label: "Publications", value: profile.publications }
      : null,
    profile.contact
      ? { label: "Contact No.", value: profile.contact }
      : null,
    profile.email
      ? { label: "E-Mail", value: profile.email }
      : null,
  ].filter(Boolean);
};

const getProfileField = (profile, labels) => {
  const targets = labels.map(normalizeLabel);
  const canonicalTargets = labels.map(canonicalProfileDetailLabel);
  const details = getProfileDetails(profile);

  return details.find((detail) => {
    const normalizedDetail = normalizeLabel(detail.label);
    const canonicalDetail = canonicalProfileDetailLabel(detail.label);
    return (
      canonicalTargets.includes(canonicalDetail) ||
      targets.some((target) => normalizedDetail.includes(target))
    );
  });
};

const isScientistProfileCard = (profile) => {
  const type = String(profile.profileType || "").toLowerCase();
  if (["scientist", "former", "former-scientist", "former_scientist"].includes(type)) {
    return true;
  }

  const designation = getProfileField(profile, ["Designation"])?.value || "";
  return /\bscientist\b|\u0935\u0948\u091c\u094d\u091e\u093e\u0928\u093f\u0915/iu.test(
    `${profile.designation || ""} ${profile.role || ""} ${profile.category || ""} ${designation}`
  );
};

const normalizeEmployeeId = (value) =>
  compactText(value).replace(/[^a-z0-9]+/gi, "").toLowerCase();

const getProfileEmployeeId = (profile) =>
  normalizeEmployeeId(
    profile.employeeId ||
      profile.employee_id ||
      getProfileField(profile, ["Employee Id", "Emp Id", "कर्मचारी आईडी"])
        ?.value ||
      ""
  );

// Language-neutral identity for active scientists. The Hindi scientific-manpower
// page carries Devanagari names but the same E-xxx employee IDs as the English
// roster, so name-matching alone drops every card in Hindi. Match by ID too.
const getActiveScientistEmployeeIds = (scientistProfiles) =>
  new Set(
    getScientistProfileData(scientistProfiles)
      .map((profile) => getProfileEmployeeId(profile))
      .filter((id) => id && id !== "notlisted")
  );

const getKnownScientistProfile = (profile, scientistProfiles) => {
  // Match the current localized CMS roster even when imported page headings
  // use the other language or a different honorific.
  const scientists = getScientistProfileData(scientistProfiles);
  const employeeId = getProfileEmployeeId(profile);
  const profileName = normalizeEquivalentHonorifics(getProfileName(profile));
  const profileNames = new Set([
    profileName,
    normalizeEquivalentHonorifics(profile.baseName || ""),
  ].filter(Boolean));

  const matched = (
    (employeeId &&
      scientists.find(
        (scientist) => getProfileEmployeeId(scientist) === employeeId
      )) ||
    scientists.find(
      (scientist) => [scientist.name, scientist.baseName]
        .map(normalizeEquivalentHonorifics)
        .some((name) => name && profileNames.has(name))
    )
  );

  if (!matched) return null;

  const matchedEmployeeId = getProfileEmployeeId(matched);
  if (matchedEmployeeId && matchedEmployeeId !== "notlisted") {
    return scientists.find(
      (scientist) => getProfileEmployeeId(scientist) === matchedEmployeeId
    ) || matched;
  }

  return matched;
};

const mergeKnownScientistDetails = (
  profile,
  scientistProfiles,
  supplementalProfiles = []
) => {
  const knownProfile = getKnownScientistProfile(profile, scientistProfiles);

  if (!knownProfile && !supplementalProfiles.length) {
    return profile;
  }

  const supplements = supplementalProfiles.filter(Boolean);
  const knownDetails = knownProfile
    ? getProfileDetails({ ...knownProfile, details: undefined })
    : [];
  const mergedDetails = mergeProfileDetailRows(
    knownDetails,
    supplements.flatMap((item) => getProfileDetails(item)),
    getProfileDetails(profile)
  );
  const preferredProfile = knownProfile || supplements[0] || profile;
  const preferredName = getProfileName(preferredProfile);
  const preferredImage =
    getProfileImage(knownProfile || {}) ||
    supplements.map(getProfileImage).find(Boolean) ||
    getProfileImage(profile);

  return {
    ...profile,
    ...(knownProfile || {}),
    name: preferredName !== "Profile" ? preferredName : getProfileName(profile),
    image: preferredImage,
    details: mergedDetails,
  };
};

const getImageUrl = (image) => {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return (
    image.url ||
    image.source_url ||
    image.media_details?.sizes?.medium?.source_url ||
    image.media_details?.sizes?.thumbnail?.source_url ||
    ""
  );
};

const getProfileImage = (profile) =>
  getImageUrl(
    profile.photo ||
      profile.image ||
      profile.featured_image ||
      profile.acf?.image ||
      profile.acf?.photo ||
      profile._embedded?.["wp:featuredmedia"]?.[0]
  );

const scientistProfilesMatch = (leftProfile, rightProfile) => {
  const leftId = getProfileEmployeeId(leftProfile);
  const rightId = getProfileEmployeeId(rightProfile);

  if (
    leftId &&
    rightId &&
    leftId !== "notlisted" &&
    rightId !== "notlisted" &&
    leftId === rightId
  ) {
    return true;
  }

  const leftNames = new Set([getProfileName(leftProfile), leftProfile.baseName]
    .map(normalizeEquivalentHonorifics)
    .filter(Boolean));
  const rightNames = [getProfileName(rightProfile), rightProfile.baseName]
    .map(normalizeEquivalentHonorifics)
    .filter(Boolean);

  if (rightNames.some((name) => leftNames.has(name))) {
    return true;
  }

  return false;
};

const isPlaceholderProfileImage = (value) =>
  /(?:^|[/\\])(?:\d+)?(?:no(?:[-_ ]*copy[-_ ]*\d*)?|placeholder|default[-_ ]*profile|profile[-_ ]*placeholder)\.(?:jpe?g|png|webp)$/i.test(
    String(value || "").split(/[?#]/)[0]
  );

const getProfileIdentityKeys = (profile) => {
  const keys = new Set();
  const employeeId = getProfileEmployeeId(profile);
  const email = compactText(profile.email || profile.acf?.email).toLowerCase();

  if (employeeId && employeeId !== "notlisted") {
    keys.add(`employee:${employeeId}`);
  }
  if (email) {
    keys.add(`email:${email}`);
  }

  for (const name of [getProfileName(profile), compactText(profile.baseName)]) {
    if (!name || name === "Profile") continue;
    const normalized = normalizeEquivalentHonorifics(name);
    if (normalized) keys.add(`name:${normalized}`);
  }

  const image = getProfileImage(profile);
  if (image && !isPlaceholderProfileImage(image)) {
    keys.add(`photo:${image.split(/[?#]/)[0].toLowerCase()}`);
  }

  return keys;
};

const profileKeysOverlap = (leftKeys, rightKeys) => {
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
};

const dedupeProfileCards = (profiles, seenKeys = new Set()) =>
  (profiles || []).filter((profile) => {
    const keys = getProfileIdentityKeys(profile);
    if (profileKeysOverlap(keys, seenKeys)) return false;
    keys.forEach((key) => seenKeys.add(key));
    return true;
  });

const profileCardKey = (prefix, profile, index) => {
  const identity = [...getProfileIdentityKeys(profile)].sort()[0] ||
    normalizeName(getProfileName(profile)) ||
    "profile";
  return `${prefix}-${identity}-${index}`;
};

const filterHiddenPageProfiles = (page, profiles) => {
  const hiddenKeys = new Set();
  for (const name of page.hiddenProfileNames || []) {
    getProfileIdentityKeys({ name }).forEach((key) => hiddenKeys.add(key));
  }
  return profiles.filter(
    (profile) => !profileKeysOverlap(getProfileIdentityKeys(profile), hiddenKeys)
  );
};

const getPageProfiles = (page, scientistProfiles) => {
  const profiles = filterHiddenPageProfiles(page, Array.isArray(page.profiles)
    ? page.profiles
    : extractProfileCards(
        applyImportedPageBlocks(page.html, page.blocks, { insertNewAssets: false })
      ));

  if (page.slug !== "scientific-manpower") {
    return dedupeProfileCards(profiles);
  }

  const activeNames = getActiveScientistNames(scientistProfiles);
  const activeIds = getActiveScientistEmployeeIds(scientistProfiles);

  const activeProfiles = profiles.filter((profile) => {
    const id = getProfileEmployeeId(profile);
    return (
      activeNames.has(normalizeName(getProfileName(profile))) ||
      (id && activeIds.has(id))
    );
  });

  const rosterProfiles = getScientistProfileData(scientistProfiles);
  const orderedProfiles = rosterProfiles.map(
    (scientist) =>
      activeProfiles.find((profile) =>
        scientistProfilesMatch(profile, scientist)
      ) || scientist
  );

  for (const profile of activeProfiles) {
    if (
      !orderedProfiles.some((scientist) =>
        scientistProfilesMatch(profile, scientist)
      )
    ) {
      orderedProfiles.push(profile);
    }
  }

  return dedupeProfileCards(orderedProfiles);
};

// Language-independent identity keys for a former-scientist profile. The
// scraped page roster keeps English names even on the Hindi page, while a CMS
// override in Hindi mode carries the editor's manual name_hi — and manual
// Devanagari spellings legitimately differ from the official translation map
// (e.g. anusvara "चंद्र" vs conjunct "चन्द्र"), so a single localized-name key
// can never pair the two sides. Union every rendering we know: the localized
// name, the raw English CMS name (baseName), and their official Hindi
// translations. Two profiles are the same person when any key is shared.
const formerProfileNameAliasGroups = [
  [
    "Dr. ANJANI KUMAR TANGRI",
    "डॉ. अंजनी कुमार तांगरी",
    "डॉ. अंजनी कुमार टांगरी",
  ],
  ["Shri Ram Chandra", "श्री राम चन्द्र", "श्री राम चंद्र"],
];

const formerProfileNameAliasLookup = new Map();
formerProfileNameAliasGroups.forEach((group) => {
  group.forEach((name) => {
    formerProfileNameAliasLookup.set(normalizeName(name), group);
    formerProfileNameAliasLookup.set(normalizeEquivalentHonorifics(name), group);
  });
});

const getFormerProfileNameKeys = (profile) => {
  const keys = new Set();
  const addDirect = (value) => {
    const normalized = normalizeName(value);
    if (normalized) {
      keys.add(normalized);
    }
    const honorificNormalized = normalizeEquivalentHonorifics(value);
    if (honorificNormalized) {
      keys.add(honorificNormalized);
    }
  };
  const add = (value) => {
    addDirect(value);
    const aliases =
      formerProfileNameAliasLookup.get(normalizeName(value)) ||
      formerProfileNameAliasLookup.get(normalizeEquivalentHonorifics(value)) ||
      [];
    aliases.forEach(addDirect);
  };

  for (const name of [getProfileName(profile), compactText(profile.baseName)]) {
    if (!name || name === "Profile") {
      continue;
    }
    add(name);
  }

  return keys;
};

const formerKeysOverlap = (leftKeys, rightKeys) => {
  for (const key of leftKeys) {
    if (rightKeys.has(key)) {
      return true;
    }
  }
  return false;
};

// Detail-row labels that mean the same field, across page HTML (English or
// Hindi) and the CMS flat columns, so a CMS edit replaces the page's stale row
// instead of appearing as a duplicate.
const formerDetailLabelGroups = [
  ["designation", "पदनाम"],
  ["deployment", "division", "posting", "तैनाती", "नियुक्ति"],
  ["employeeid", "empid", "कर्मचारीआईडी"],
  ["duration", "tenure", "timeperiod", "अवधि", "कार्यकाल", "समयावधि", "समयसीमा"],
  ["specialization", "विशेषज्ञता"],
  ["experience", "अनुभव"],
  ["publication", "प्रकाशन"],
  ["contact", "संपर्क"],
  ["email", "ईमेल", "इमेल"],
  ["qualification", "योग्यता"],
];

const canonicalFormerDetailLabel = (label) => {
  const normalized = normalizeLabel(label);

  for (const group of formerDetailLabelGroups) {
    if (group.some((alias) => normalized.includes(alias))) {
      return group[0];
    }
  }

  return normalized;
};

// Merge a CMS override into a page/roster profile so that EVERY edited CMS
// field reaches the card. The page profile carries a parsed `details` array,
// and getProfileDetails ignores flat fields once that array exists — so the
// override's flat columns (experience, designation, contact, …) must be folded
// into the detail rows: replace a row with the same canonical label, append
// the rest.
const applyFormerProfileOverride = (profile, override) => {
  const baseDetails = getProfileDetails(profile);
  const overrideRows = [
    ...(Array.isArray(override.details) ? override.details : []),
    ...getProfileDetails({ ...override, details: undefined }),
  ].filter((row) => row?.label && row?.value);

  const overrideRowsByLabel = new Map();
  overrideRows.forEach((row) => {
    const key = canonicalFormerDetailLabel(row.label);
    if (!overrideRowsByLabel.has(key)) {
      overrideRowsByLabel.set(key, row);
    }
  });

  const usedLabels = new Set();
  const mergedDetails = baseDetails.map((row) => {
    const key = canonicalFormerDetailLabel(row.label);
    const overrideRow = overrideRowsByLabel.get(key);

    if (!overrideRow) {
      return row;
    }

    usedLabels.add(key);
    return { ...row, value: overrideRow.value };
  });

  overrideRowsByLabel.forEach((row, key) => {
    if (!usedLabels.has(key)) {
      mergedDetails.push(row);
    }
  });

  const overrideName = getProfileName(override);

  return {
    ...profile,
    ...override,
    name: overrideName !== "Profile" ? overrideName : getProfileName(profile),
    image: getProfileImage(override) || getProfileImage(profile),
    duration:
      getProfileDurationValue(override) ||
      getProfileDurationValue(profile) ||
      "To be updated",
    details: mergedDetails,
  };
};

const mergeFormerProfileOverrides = (profiles, overrides) => {
  const overrideEntries = overrides.map((override) => ({
    override,
    keys: getFormerProfileNameKeys(override),
    matched: false,
  }));
  const findOverrideEntry = (keys) =>
    overrideEntries.find((entry) => formerKeysOverlap(entry.keys, keys));
  const seenKeys = new Set();
  const markSeen = (keys) => keys.forEach((key) => seenKeys.add(key));

  const mergedProfiles = profiles.map((profile) => {
    const keys = getFormerProfileNameKeys(profile);
    markSeen(keys);
    const entry = findOverrideEntry(keys);

    if (!entry) {
      return {
        ...profile,
        duration: getProfileDurationValue(profile),
      };
    }

    entry.matched = true;
    markSeen(entry.keys);
    return applyFormerProfileOverride(profile, entry.override);
  });

  // Roster completeness: the Hindi page HTML can be missing a person's card
  // entirely (their CMS profile then silently vanished in Hindi). Append every
  // known roster person the page didn't render, with their CMS override
  // applied when one exists.
  // Genuinely new CMS-only people — not on the page and not in the roster.
  overrideEntries.forEach((entry) => {
    if (entry.matched || formerKeysOverlap(entry.keys, seenKeys)) {
      return;
    }

    markSeen(entry.keys);
    mergedProfiles.push({
      ...entry.override,
      duration: getProfileDurationValue(entry.override),
    });
  });

  return mergedProfiles;
};

const dedupeFormerSectionProfiles = (profiles, mode) => {
  const seenRecords = new Set();
  const seenPeople = new Set();

  return profiles.filter((profile) => {
    const name = normalizeEquivalentHonorifics(getProfileName(profile));
    const personKeys = getFormerProfileNameKeys(profile);
    if (mode === "flip" && formerKeysOverlap(personKeys, seenPeople)) {
      return false;
    }

    const tenure = getProfileDurationValue(profile) ||
      getProfileField(profile, ["Duration", "Tenure", "Time Period"])?.value || "";
    const recordKey = `${name}|${normalizeName(tenure)}`;

    if (seenRecords.has(recordKey)) {
      return false;
    }

    seenRecords.add(recordKey);
    personKeys.forEach((key) => seenPeople.add(key));
    return true;
  });
};

const dedupeFormerSections = (sections) =>
  sections.map((section) => ({
    ...section,
    profiles: dedupeFormerSectionProfiles(section.profiles, section.mode),
  }));

const looksLikePersonName = (value) =>
  /^(hon'?ble\s+|late\s+|माननीय\s+|स्वर्गीय\s+)?(dr\.?|prof\.?|shri\.?|sri|smt\.?|sushri|mr\.?|ms\.?|mohd\.?|श्री\.?|श्रीमती|सुश्री|डॉ\.?|डॉ॰|प्रो\.?|कुमारी)/i.test(
    compactText(value)
  );

// Hindi profile-detail labels harvested from the official RSAC Hindi tables.
const hindiProfileDetailLabels = new Set([
  "पदनाम", "नाम", "योग्यता", "शैक्षिक योग्यता", "शैक्षणिक योग्यता",
  "विशेषज्ञता", "विशेषज्ञता का क्षेत्र", "अनुभव", "अनुभव वर्षों में",
  "प्रकाशन", "प्रकाशनों की संख्या", "संपर्क", "संपर्क संख्या", "संपर्क सूत्र",
  "ई-मेल", "ईमेल", "ईमेल आईडी", "तैनाती", "नियुक्ति", "समयावधि",
  "वर्तमान पद", "कर्मचारी आईडी", "अवधि", "कार्यकाल", "समय सीमा",
]);

const isProfileDetailLabel = (value) => {
  const text = compactText(value).replace(/[:：]$/, "").trim();
  return (
    /^(time period|designation|qualification|educational qualification|area of specialization|area of specialisation|experience|experience in years|experience in years\/projects|no of publications|contact no\.?|e-?mail id|employee id|deployment)$/i.test(
      text
    ) || hindiProfileDetailLabels.has(text)
  );
};

const getProfileRows = (container) => {
  const details = [];
  let pendingLabel = null;

  Array.from(container.querySelectorAll("tr")).forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td, th"))
      .map((cell) => compactText(cell.textContent))
      .filter(Boolean);

    if (!cells.length || /^view profile$/i.test(cells.join(" "))) {
      return;
    }

    if (cells.length >= 2) {
      details.push({
        label: cells[0].replace(/:$/, ""),
        value: cells.slice(1).join(" "),
      });
      pendingLabel = null;
      return;
    }

    const [cellText] = cells;

    if (pendingLabel && !isProfileDetailLabel(cellText)) {
      details.push({
        label: pendingLabel,
        value: cellText,
      });
      pendingLabel = null;
      return;
    }

    if (isProfileDetailLabel(cellText)) {
      pendingLabel = cellText.replace(/:$/, "");
    }
  });

  return details;
};

const findProfileContainer = (heading) => {
  let container = heading.parentElement;

  for (let depth = 0; container && depth < 8; depth += 1) {
    const hasProfileData = container.querySelector("img[src], table");
    const tooBroad = compactText(container.textContent).length > 3200;

    if (hasProfileData && !tooBroad) {
      return container;
    }

    container = container.parentElement;
  }

  return null;
};

const isProfileCandidate = ({ name, container, rows, image }) => {
  if (!name || name.length < 3 || /content will be available soon/i.test(name)) {
    return false;
  }

  const hasProfileRows = rows.some((row) =>
    /designation|qualification|specialization|specialisation|experience|publication|contact|mail|deployment|period/i.test(
      row.label
    )
  );

  return Boolean(container && (hasProfileRows || looksLikePersonName(name)) && (image || rows.length));
};

const getProfileCandidates = (document) => {
  const headings = Array.from(document.querySelectorAll("h3, h4"));
  const containers = new Set();

  return headings
    .map((heading) => {
      const name = compactText(heading.textContent);
      const container = findProfileContainer(heading);

      if (!container || containers.has(container)) {
        return null;
      }

      const image = container.querySelector("img[src]");
      const rows = getProfileRows(container);
      const candidate = { name, heading, container, image, rows };

      if (!isProfileCandidate(candidate)) {
        return null;
      }

      containers.add(container);
      return candidate;
    })
    .filter(Boolean);
};

const extractProfileCards = (html) => {
  if (typeof DOMParser === "undefined") {
    return [];
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const profileMap = new Map();

  getProfileCandidates(document).forEach(({ name, image, rows }) => {
    const key = normalizeName(name);
    const card = {
      name,
      image: image?.getAttribute("src") || "",
      details: rows,
      score: rows.length + (image ? 1 : 0),
    };
    const existing = profileMap.get(key);

    if (!existing) {
      profileMap.set(key, card);
      return;
    }

    const preferred = card.score > existing.score ? card : existing;
    const fallback = preferred === card ? existing : card;
    const details = mergeProfileDetailRows(
      preferred.details,
      fallback.details
    );

    profileMap.set(key, {
      ...fallback,
      ...preferred,
      image: preferred.image || fallback.image,
      details,
      score: details.length + (preferred.image || fallback.image ? 1 : 0),
    });
  });

  return Array.from(profileMap.values()).filter(
    (profile) => profile.image || profile.details.length
  );
};

const findDivisionTabStrips = (document) =>
  Array.from(document.querySelectorAll("div")).filter((element) => {
    const directSpans = Array.from(element.children).filter(
      (child) => child.tagName === "SPAN"
    );
    const categories = directSpans
      .map((span) => canonicalizeDivisionCategory(span.textContent))
      .filter(Boolean);

    return directSpans.length >= 2 && categories.length >= 1;
  });

const getDivisionTabSections = (document) =>
  uniqueDivisionSections(
    findDivisionTabStrips(document)
      .flatMap((strip) =>
        Array.from(strip.children)
          .filter((child) => child.tagName === "SPAN")
          .map((span, index) => {
            const text = compactText(span.textContent);

            // Imported division tab strips always begin with the division's
            // overview. Titles such as "Geo-Spatial Data Bank Division"
            // contain a category name, so text matching alone can otherwise
            // misclassify the overview as a later tab.
            if (index === 0) {
              return text
                ? {
                    key: "overview",
                    label: text,
                  }
                : null;
            }

            const category = canonicalizeDivisionCategory(text);

            if (category) {
              return category;
            }

            return text
              ? {
                  key: "overview",
                  label: text,
                }
              : null;
          })
      )
      .filter(Boolean)
  );

// pageTitle may be a single title or several candidate titles. Division bodies
// stay ENGLISH even in Hindi mode (the text is translated at render), so the
// Hindi page.title never matches the English heading in the body — pass the
// English baseTitle alongside it so the duplicate heading is stripped in BOTH
// languages, keeping Hindi consistent with English.
const removeDuplicatePageTitle = (document, pageTitle) => {
  const normalizeTitle = (value) =>
    normalizeCategoryText(value)
      .replace(/\s*&\s*/g, " and ")
      .replace(/\b(laboratory)\b/g, "lab")
      .replace(/\s+/g, " ")
      .trim();
  const normalizedTargets = new Set(
    (Array.isArray(pageTitle) ? pageTitle : [pageTitle])
      .map(normalizeTitle)
      .filter(Boolean)
  );

  if (!normalizedTargets.size) {
    return;
  }

  const titleWords = (value) => new Set(value.split(" ").filter((word) => word.length >= 3));
  const titlesEquivalent = (heading) => {
    if (normalizedTargets.has(heading)) return true;
    if (!/\bdivision\b/u.test(heading)) return false;
    const headingWords = titleWords(heading);
    if (headingWords.size < 3) return false;
    return [...normalizedTargets].some((target) => {
      if (!/\bdivision\b/u.test(target)) return false;
      const targetWords = titleWords(target);
      const common = [...headingWords].filter((word) => targetWords.has(word)).length;
      return common >= 3 && common / Math.min(headingWords.size, targetWords.size) >= 0.75;
    });
  };

  Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter((heading) => titlesEquivalent(normalizeTitle(heading.textContent)))
    .forEach((heading) => heading.remove());
};

const markProfileContainers = (document) => {
  getProfileCandidates(document).forEach(({ container }) => {
    const marker = document.createElement("div");
    marker.setAttribute("data-profile-marker", "true");
    container.replaceWith(marker);
  });
};

const pruneEmptyImportedWrappers = (document) => {
  Array.from(document.body.querySelectorAll("div, p, span, strong, h1, h2, h3, h4, h5, h6"))
    .reverse()
    .forEach((element) => {
      if (
        !compactText(element.textContent) &&
        !element.querySelector("img[src], table, ul, ol, a[href], iframe, video")
      ) {
        element.remove();
      }
    });
};

const isDuplicateMediaHeading = (text, pageTitle) => {
  const mediaWords = /(?:\b(?:map\s*\/\s*)?photos?\b|\bimages?\b|मानचित्र\s*\/\s*तस्वीरें|तस्वीरें|फोटो|चित्र)/iu;
  if (!pageTitle || !mediaWords.test(text)) {
    return false;
  }

  const normalizeMediaTitle = (value) =>
    normalizeCategoryText(value)
      .replace(/\s*&\s*/g, " and ")
      .replace(/\s+/g, " ")
      .trim();
  const normalizedTitle = normalizeMediaTitle(pageTitle);
  const titleWithoutSuffix = normalizeMediaTitle(
    pageTitle.replace(/\b(lab|laboratory|division|section)\b/gi, "")
  );
  const textWithoutPhotos = normalizeMediaTitle(
    text
      .replace(/\b(map\s*\/\s*)?photos?\b/gi, "")
      .replace(/\bimages?\b/gi, "")
      .replace(/मानचित्र\s*\/\s*तस्वीरें|तस्वीरें|फोटो|चित्र/gu, "")
  );

  // A bare media label is structural chrome, not page content. Remove it in
  // either language so English and Hindi keep the same media-grid position.
  if (!textWithoutPhotos) return true;
  if (textWithoutPhotos.length < 4) return false;

  return (
    normalizedTitle.includes(textWithoutPhotos) ||
    textWithoutPhotos.includes(normalizedTitle) ||
    (titleWithoutSuffix &&
      (titleWithoutSuffix.includes(textWithoutPhotos) ||
        textWithoutPhotos.includes(titleWithoutSuffix)))
  );
};

const removeAwkwardImportedMediaHeadings = (document, pageTitle) => {
  Array.from(document.body.querySelectorAll("h2, h3, h4, h5, h6, p, strong, span"))
    .reverse()
    .forEach((element) => {
      const text = compactText(element.textContent);

      if (!text || text.length > 140 || !isDuplicateMediaHeading(text, pageTitle)) {
        return;
      }

      const parentText = compactText(element.parentElement?.textContent || "");

      if (
        parentText &&
        parentText !== text &&
        !element.matches("h2, h3, h4, h5, h6, p")
      ) {
        return;
      }

      element.remove();
    });
};

const removeImportedMediaLabelStrips = (document, pageTitle) => {
  if (!pageTitle) {
    return;
  }

  const normalizeMediaTitle = (value) =>
    normalizeCategoryText(value)
      .replace(/\s*&\s*/g, " and ")
      .replace(/\s+/g, " ")
      .trim();
  const normalizedTitle = normalizeMediaTitle(
    pageTitle.replace(/\b(lab|laboratory|division|section)\b/gi, "")
  );

  Array.from(document.body.querySelectorAll("div"))
    .reverse()
    .forEach((container) => {
      const directLabels = Array.from(container.children)
        .filter((child) => child.matches("span, strong, a"))
        .map((child) => compactText(child.textContent))
        .filter(Boolean);
      const text = compactText(container.textContent);
      const normalizedText = normalizeMediaTitle(text);
      const hasMediaLabel = directLabels.some((label) =>
        /(?:\bphotos?\b|मानचित्र\s*\/\s*तस्वीरें|फोटो)/iu.test(label)
      );

      if (
        directLabels.length < 2 ||
        text.length > 220 ||
        container.querySelector("p, ul, ol, table, img, video, iframe") ||
        !hasMediaLabel ||
        !normalizedText.includes(normalizedTitle)
      ) {
        return;
      }

      container.remove();
    });
};

const removeImportedArtifacts = (document) => {
  const walker = document.createTreeWalker(document.body, 4);
  const removableNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = compactText(node.textContent);

    if (/^(?:-->|->|→|&rarr;)$/i.test(text)) {
      removableNodes.push(node);
    }
  }

  removableNodes.forEach((node) => node.remove());
};

// CMS-authored bodies (for example, pasted Hindi HTML) often carry inline
// sizing/positioning copied from the source — fixed pixel widths, float,
// position, table width attributes. Inline styles and presentational size
// attributes outrank the .rsac-rich-content design-system CSS, so they overflow
// the container and break the responsive layout when the Hindi body is edited in
// the source editor. Strip ONLY layout-affecting declarations/attributes here; keep
// harmless formatting (color, bold, text-align) so an editor's emphasis
// survives. The scraped generated content has none of these, so this is a no-op
// there — it only guards content entered through the CMS.
const LAYOUT_STYLE_PROPS = new Set([
  "width", "height", "min-width", "max-width", "min-height", "max-height",
  "position", "top", "right", "bottom", "left", "float", "clear",
  "white-space", "display", "overflow", "overflow-x", "overflow-y", "transform",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
]);

const PRESENTATIONAL_ATTRS = [
  "width", "height", "align", "valign", "bgcolor", "border",
  "cellpadding", "cellspacing", "hspace", "vspace", "nowrap",
];

const sanitizeInlineStyle = (style) =>
  style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const property = declaration.split(":")[0].trim().toLowerCase();
      return property && !LAYOUT_STYLE_PROPS.has(property);
    })
    .join("; ");

const stripLayoutBreakingPresentation = (document) => {
  document.querySelectorAll("[style]").forEach((element) => {
    const cleaned = sanitizeInlineStyle(element.getAttribute("style") || "");
    if (cleaned) {
      element.setAttribute("style", cleaned);
    } else {
      element.removeAttribute("style");
    }
  });

  PRESENTATIONAL_ATTRS.forEach((attribute) => {
    document
      .querySelectorAll(`[${attribute}]`)
      .forEach((element) => element.removeAttribute(attribute));
  });
};

const removeTrailingOrphanHeading = (document) => {
  while (true) {
    const meaningfulChildren = Array.from(document.body.children).filter(
      (element) =>
        compactText(element.textContent) ||
        element.querySelector("img, video, iframe, table, ul, ol")
    );
    const last = meaningfulChildren[meaningfulChildren.length - 1];

    if (!last?.matches("h1, h2, h3, h4, h5, h6")) {
      break;
    }
    last.remove();
  }
};

const sanitizeOfficialHtml = (
  html,
  { pageTitle = "", baseTitle = "", stripProfiles = false, stripMediaHeadings = true } = {}
) => {
  if (typeof DOMParser === "undefined" || !html) {
    return html;
  }

  const document = new DOMParser().parseFromString(html, "text/html");

  document.querySelectorAll("a[href]").forEach((link) => {
    if (isUnmirroredLegacyMedia(link.getAttribute("href"))) {
      link.replaceWith(...Array.from(link.childNodes));
    }
  });

  if (pageTitle || baseTitle) {
    removeDuplicatePageTitle(document, [pageTitle, baseTitle].filter(Boolean));
  }

  if (stripProfiles) {
    markProfileContainers(document);
    document
      .querySelectorAll("[data-profile-marker]")
      .forEach((marker) => marker.remove());
  }

  if (stripMediaHeadings) {
    removeAwkwardImportedMediaHeadings(document, pageTitle);
    removeImportedMediaLabelStrips(document, pageTitle);
  }

  removeImportedArtifacts(document);
  stripLayoutBreakingPresentation(document);
  pruneEmptyImportedWrappers(document);
  removeTrailingOrphanHeading(document);

  // Blank CMS alt text is intentional. Keep a standards-valid empty alt
  // attribute without inventing visible captions or image descriptions.
  Array.from(document.querySelectorAll("img")).forEach((image) => {
    if (!image.hasAttribute("alt")) image.setAttribute("alt", "");
  });

  return document.body.innerHTML;
};

const getMeaningfulChildren = (element) =>
  Array.from(element.children).filter(
    (child) =>
      child.matches("[data-profile-marker]") ||
      compactText(child.textContent) ||
      child.querySelector("img[src], table")
  );

const hasProfileMarker = (element) =>
  element.matches("[data-profile-marker]") ||
  Boolean(element.querySelector("[data-profile-marker]"));

const findDivisionContentContainer = (document) => {
  let container = document.body;

  for (let depth = 0; depth < 10; depth += 1) {
    const children = getMeaningfulChildren(container);
    const onlyChild = children[0];

    if (
      children.length === 1 &&
      onlyChild.tagName === "DIV" &&
      !onlyChild.matches("[data-profile-marker]")
    ) {
      container = onlyChild;
    } else {
      break;
    }
  }

  return container;
};

const containsElement = (container, target) =>
  container === target || Boolean(container?.contains(target));

const findDivisionContentPanels = (document) => {
  const strips = findDivisionTabStrips(document);

  if (!strips.length) {
    return [];
  }

  for (const strip of strips) {
    let container = strip.parentElement;

    for (let depth = 0; container && depth < 8; depth += 1) {
      const children = getMeaningfulChildren(container);
      const stripIndex = children.findIndex((child) =>
        containsElement(child, strip)
      );

      if (stripIndex !== -1) {
        const following = children
          .slice(stripIndex + 1)
          .filter((child) => !containsElement(child, strip));
        const panels =
          following.length === 1
            ? getMeaningfulChildren(following[0]).filter(
                (child) => !containsElement(child, strip)
              )
            : following;
        const usablePanels = panels.filter(
          (panel) =>
            !isDivisionCategoryMarker(panel) &&
            (compactText(panel.textContent) ||
              panel.querySelector("img[src], table, ul, ol"))
        );

        if (usablePanels.length >= 2) {
          return usablePanels;
        }
      }

      container = container.parentElement;
    }
  }

  return [];
};

const startsWithCategoryLabel = (element) => {
  const firstChild = getMeaningfulChildren(element)[0];
  const leadingText = compactText(firstChild?.textContent || element.textContent).slice(0, 140);

  return Boolean(canonicalizeDivisionCategory(leadingText));
};

const isDivisionCategoryMarker = (element) => {
  if (!element || hasProfileMarker(element)) {
    return false;
  }

  if (["TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "UL", "OL", "LI"].includes(element.tagName)) {
    return false;
  }

  if (element.tagName === "DIV" && getMeaningfulChildren(element).length > 1) {
    return false;
  }

  if (element.querySelector("img[src], table, ul, ol")) {
    return false;
  }

  const text = compactText(element.textContent);

  if (!text || text.length > 180) {
    return false;
  }

  return Boolean(canonicalizeDivisionCategory(text));
};

const hasDivisionCategoryMarker = (element) =>
  isDivisionCategoryMarker(element) ||
  Boolean(
    element.querySelector(
      "h3, h4, h5, h6, p, span, strong, div"
    ) &&
      Array.from(
        element.querySelectorAll("h3, h4, h5, h6, p, span, strong, div")
      ).some(isDivisionCategoryMarker)
  );

const collectDivisionBlocks = (element) => {
  const children = getMeaningfulChildren(element);

  if (!children.length) {
    return compactText(element.textContent) || element.querySelector("img[src], table")
      ? [element]
      : [];
  }

  return children.flatMap((child) => {
    if (
      child.matches("[data-profile-marker]") ||
      isDivisionCategoryMarker(child) ||
      ["TABLE", "UL", "OL"].includes(child.tagName)
    ) {
      return [child];
    }

    const childChildren = getMeaningfulChildren(child);
    const canFlatten =
      child.tagName === "DIV" &&
      !hasProfileMarker(child) &&
      childChildren.length > 1 &&
      (hasDivisionCategoryMarker(child) ||
        (!startsWithCategoryLabel(child) && compactText(child.textContent).length > 600));

    return canFlatten ? collectDivisionBlocks(child) : [child];
  });
};

const blocksToHtml = (blocks) =>
  blocks
    .map((block) => {
      const clone = block.cloneNode(true);

      if (clone.matches("[data-profile-marker]")) {
        return "";
      }

      clone.querySelectorAll("[data-profile-marker]").forEach((marker) => marker.remove());
      return clone.outerHTML;
    })
    .join("")
    .trim();

const getCategoryForBlock = (block) => {
  const leadingText = compactText(block.textContent).slice(0, 160);

  return canonicalizeDivisionCategory(leadingText);
};

const getBlockCategoryMarkers = (block) => {
  if (isDivisionCategoryMarker(block)) {
    const category = getCategoryForBlock(block);
    return category ? [category] : [];
  }

  return Array.from(block.querySelectorAll("h3, h4, h5, h6, p, span, strong, div"))
    .filter(isDivisionCategoryMarker)
    .map(getCategoryForBlock)
    .filter(Boolean);
};

const getHtmlBlocks = (html) => {
  if (typeof DOMParser === "undefined" || !html) {
    return [];
  }

  const document = new DOMParser().parseFromString(html, "text/html");

  return collectDivisionBlocks(document.body).filter(
    (block) =>
      compactText(block.textContent) ||
      block.querySelector("img[src], table, ul, ol, a[href]")
  );
};

const blockMatchesText = (block, matcher) => {
  if (!matcher) {
    return false;
  }

  if (typeof matcher === "function") {
    return matcher(block);
  }

  const text = compactText(block.textContent);

  if (typeof matcher === "string") {
    return text.toLowerCase().includes(matcher.toLowerCase());
  }

  return matcher.test(text);
};

const isGroundwaterPublicationTableBlock = (block) => {
  const table = block?.matches?.("table")
    ? block
    : block?.querySelector?.("table");

  if (!table) {
    return false;
  }

  const headerText = compactText(table.querySelector("tr")?.textContent);

  return (
    /(?:subject|topic|विषय)/iu.test(headerText) &&
    /(?:author|लेखक)/iu.test(headerText) &&
    /(?:journal|जर्नल)/iu.test(headerText)
  );
};

const htmlHasContent = (html) => {
  if (!html) {
    return false;
  }

  const blocks = getHtmlBlocks(html);

  return blocks.some(
    (block) =>
      compactText(block.textContent) ||
      block.querySelector("img[src], table, ul, ol, a[href]")
  );
};

const splitHtmlAtText = (html, matcher) => {
  const blocks = getHtmlBlocks(html);
  const markerIndex = blocks.findIndex((block) => blockMatchesText(block, matcher));

  if (markerIndex === -1) {
    return null;
  }

  return {
    beforeHtml: blocksToHtml(blocks.slice(0, markerIndex)),
    matchedHtml: blocksToHtml(blocks.slice(markerIndex)),
  };
};

const splitHtmlBetweenText = (html, startMatcher, endMatcher) => {
  const blocks = getHtmlBlocks(html);
  const startIndex = blocks.findIndex((block) =>
    blockMatchesText(block, startMatcher)
  );

  if (startIndex === -1) {
    return null;
  }

  const relativeEndIndex = blocks
    .slice(startIndex + 1)
    .findIndex((block) => blockMatchesText(block, endMatcher));
  const endIndex =
    relativeEndIndex === -1 ? blocks.length : startIndex + 1 + relativeEndIndex;

  return {
    beforeHtml: blocksToHtml(blocks.slice(0, startIndex)),
    matchedHtml: blocksToHtml(blocks.slice(startIndex, endIndex)),
    afterHtml: blocksToHtml(blocks.slice(endIndex)),
  };
};

const normalizeMovedSectionHtml = (html, heading) => {
  if (!html || typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const firstHeading = document.body.querySelector("h1, h2, h3, h4, h5, h6");

  if (!firstHeading && heading) {
    const headingElement = document.createElement("h3");
    headingElement.textContent = heading;
    document.body.prepend(headingElement);
  }

  return document.body.innerHTML.trim();
};

const findSectionIndex = (sections, keys) => {
  const sectionKeys = Array.isArray(keys) ? keys : [keys];

  return sections.findIndex((section) => sectionKeys.includes(section.key));
};

const upsertSection = (sections, { key, label, html, type = "html" }, afterKey) => {
  if (!htmlHasContent(html)) {
    return sections;
  }

  const existingIndex = findSectionIndex(sections, key);

  if (existingIndex !== -1) {
    const existingSection = sections[existingIndex];
    const separator = existingSection.html && html ? "" : "";

    return sections.map((section, index) =>
      index === existingIndex
        ? {
            ...section,
            label,
            type,
            html: `${existingSection.html || ""}${separator}${html}`.trim(),
          }
        : section
    );
  }

  const nextSection = { key, label, type, html };
  const afterIndex = afterKey ? findSectionIndex(sections, afterKey) : -1;

  if (afterIndex === -1) {
    return [...sections, nextSection];
  }

  return [
    ...sections.slice(0, afterIndex + 1),
    nextSection,
    ...sections.slice(afterIndex + 1),
  ];
};

const removeEmptySections = (sections) =>
  sections.filter((section) =>
    section.type === "profiles" ? section.profiles?.length : htmlHasContent(section.html)
  );

const isSerialNumberHeader = (value) =>
  /^(?:(?:sl|sr)\.?\s*(?:no|number)|s\.?\s*(?:no|number|n)|serial\s*(?:no|number)|क्र\.?\s*सं\.?|क्रम(?:\s*संख्या|ांक)|अनुक्रमांक)(?:\.|\u0964)?$/iu.test(
    compactText(value)
  );

const latestFirstSectionKeys = new Set([
  "completed-projects",
  "ongoing-projects",
  "technical-reports",
  "publications",
  "research-paper-published",
  "research-papers",
  "map-photos",
]);

const getLatestYearRank = (value) => {
  const years = compactText(value).match(/\b(?:19|20)\d{2}\b/g);

  if (!years?.length) {
    return null;
  }

  return Math.max(...years.map((year) => Number(year)));
};

const shouldUseLatestFirst = (sectionKey, text) =>
  latestFirstSectionKeys.has(sectionKey) ||
  /\b(?:paper|report|project|publication|notice|download|gallery|photo)\b/i.test(
    compactText(text)
  );

const isEditorAddedElement = (element) =>
  element?.matches?.("[data-rsac-added-item='true']");

const sortElementsLatestFirst = (elements, getText) => {
  const ranked = elements.map((element, index) => ({
    element,
    index,
    editorAdded: isEditorAddedElement(element),
    rank: getLatestYearRank(getText(element)),
  }));
  const datedCount = ranked.filter((item) => item.rank !== null).length;
  const editorAddedCount = ranked.filter((item) => item.editorAdded).length;

  if (datedCount < 2 && !editorAddedCount) {
    return elements;
  }

  return ranked
    .sort((left, right) => {
      if (left.editorAdded !== right.editorAdded) {
        return left.editorAdded ? -1 : 1;
      }
      if (left.editorAdded && right.editorAdded) {
        return left.index - right.index;
      }
      if (left.rank === null && right.rank === null) {
        return left.index - right.index;
      }
      if (left.rank === null) {
        return 1;
      }
      if (right.rank === null) {
        return -1;
      }
      return right.rank - left.rank || left.index - right.index;
    })
    .map((item) => item.element);
};

const sortLatestFirstContent = (document, sectionKey) => {
  document.body.querySelectorAll("ul, ol").forEach((list) => {
    const items = Array.from(list.children).filter(
      (child) => child.tagName === "LI"
    );

    if (
      items.length < 2 ||
      !shouldUseLatestFirst(sectionKey, list.textContent)
    ) {
      return;
    }

    const sorted = sortElementsLatestFirst(items, (item) => item.textContent);

    if (sorted.some((item, index) => item !== items[index])) {
      sorted.forEach((item) => list.appendChild(item));
    }
  });

  document.body.querySelectorAll("table").forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    const headerRow = rows.find((row) =>
      Array.from(row.children).some((cell) =>
        isSerialNumberHeader(cell.textContent)
      )
    );

    if (!headerRow || !shouldUseLatestFirst(sectionKey, table.textContent)) {
      return;
    }

    const bodyRows = rows.slice(rows.indexOf(headerRow) + 1).filter((row) => {
      const cells = Array.from(row.children);
      return cells.length && row.querySelectorAll("th").length !== cells.length;
    });
    const sorted = sortElementsLatestFirst(bodyRows, (row) => row.textContent);

    if (!sorted.some((row, index) => row !== bodyRows[index])) {
      return;
    }

    const targetParent = bodyRows[0]?.parentElement;

    if (targetParent) {
      sorted.forEach((row) => targetParent.appendChild(row));
    }
  });
};

const fillSerialNumbersInDocument = (document, sectionKey) => {
  sortLatestFirstContent(document, sectionKey);

  document.querySelectorAll("table").forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    const headerRow = rows.find((row) =>
      Array.from(row.children).some((cell) =>
        isSerialNumberHeader(cell.textContent)
      )
    );

    if (!headerRow) {
      return;
    }

    const serialIndex = Array.from(headerRow.children).findIndex((cell) =>
      isSerialNumberHeader(cell.textContent)
    );

    if (serialIndex === -1) {
      return;
    }

    const serialHeaderCell = headerRow.children[serialIndex];
    serialHeaderCell.textContent = localizeOfficialText("S.No.");

    let serial = 1;
    rows.slice(rows.indexOf(headerRow) + 1).forEach((row) => {
      const cells = Array.from(row.children);
      const serialCell = cells[serialIndex];

      if (!serialCell || row.querySelectorAll("th").length === cells.length) {
        return;
      }

      serialCell.textContent = String(serial);

      serial += 1;
    });
  });
};

const moveSectionTail = (
  sections,
  { sourceKeys, destinationKey, destinationLabel, marker, heading, afterKey }
) => {
  const sectionKeys = Array.isArray(sourceKeys) ? sourceKeys : [sourceKeys];
  let sourceIndex = -1;
  let sourceSection = null;
  let split = null;

  for (const key of sectionKeys) {
    const candidateIndex = findSectionIndex(sections, key);

    if (candidateIndex === -1) {
      continue;
    }

    const candidateSection = sections[candidateIndex];
    const candidateSplit = splitHtmlAtText(candidateSection.html, marker);

    if (candidateSplit) {
      sourceIndex = candidateIndex;
      sourceSection = candidateSection;
      split = candidateSplit;
      break;
    }
  }

  if (!split) {
    return sections;
  }

  const movedHtml = normalizeMovedSectionHtml(
    split.matchedHtml,
    heading || destinationLabel
  );

  if (sourceSection.key === destinationKey) {
    return removeEmptySections(
      sections.map((section, index) =>
        index === sourceIndex
          ? {
              ...section,
              label: destinationLabel,
              html: `${split.beforeHtml}${movedHtml}${split.afterHtml}`.trim(),
            }
          : section
      )
    );
  }

  const nextSections = sections.map((section, index) =>
    index === sourceIndex
      ? {
          ...section,
          html: split.beforeHtml,
        }
      : section
  );

  return removeEmptySections(
    upsertSection(
      nextSections,
      {
        key: destinationKey,
        label: destinationLabel,
        html: movedHtml,
      },
      afterKey || sourceSection.key
    )
  );
};

const moveSectionRange = (
  sections,
  {
    sourceKeys,
    destinationKey,
    destinationLabel,
    startMarker,
    endMarker,
    heading,
    afterKey,
  }
) => {
  const sectionKeys = Array.isArray(sourceKeys) ? sourceKeys : [sourceKeys];
  let sourceIndex = -1;
  let sourceSection = null;
  let split = null;

  for (const key of sectionKeys) {
    const candidateIndex = findSectionIndex(sections, key);

    if (candidateIndex === -1) {
      continue;
    }

    const candidateSection = sections[candidateIndex];
    const candidateSplit = splitHtmlBetweenText(
      candidateSection.html,
      startMarker,
      endMarker
    );

    if (candidateSplit) {
      sourceIndex = candidateIndex;
      sourceSection = candidateSection;
      split = candidateSplit;
      break;
    }
  }

  if (!split) {
    return sections;
  }

  const movedHtml = normalizeMovedSectionHtml(
    split.matchedHtml,
    heading || destinationLabel
  );
  const nextSections = sections.map((section, index) =>
    index === sourceIndex
      ? {
          ...section,
          html: `${split.beforeHtml}${split.afterHtml}`.trim(),
        }
      : section
  );

  return removeEmptySections(
    upsertSection(
      nextSections,
      {
        key: destinationKey,
        label: destinationLabel,
        html: movedHtml,
      },
      afterKey || sourceSection.key
    )
  );
};

const getReadableMediaTitle = (value, language = "en") => {
  const text = compactText(value);

  if (!text) {
    return "";
  }

  const parts = text
    .split("/")
    .map((part) => compactText(part))
    .filter(Boolean);

  const hindiTitle = parts.find((part) => /[\u0900-\u097f]/u.test(part));
  const englishTitle = [...parts].reverse().find((part) => /[A-Za-z]/u.test(part));
  const title = language === "hi"
    ? hindiTitle || localizeOfficialText(parts[parts.length - 1] || text, language)
    : englishTitle || parts[parts.length - 1] || text;

  if (/^fields?\s+photos$/i.test(title)) {
    return localizeOfficialText("Field Outputs");
  }

  return title;
};

const replaceHeadingsInSection = (sections, sectionKey, replacements) =>
  sections.map((section) => {
    if (section.key !== sectionKey || !section.html || typeof DOMParser === "undefined") {
      return section;
    }

    const document = new DOMParser().parseFromString(section.html, "text/html");

    document.body
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach((heading) => {
        const headingText = compactText(heading.textContent);
        const replacement = replacements.find(({ matcher }) =>
          typeof matcher === "string"
            ? headingText.toLowerCase() === matcher.toLowerCase()
            : matcher.test(headingText)
        );

        if (replacement) {
          heading.textContent = replacement.label;
        }
      });

    return {
      ...section,
      html: document.body.innerHTML.trim(),
    };
  });

const replaceTextInSection = (sections, sectionKey, matcher, replacement = "") =>
  sections.map((section) =>
    section.key === sectionKey && section.html
      ? {
          ...section,
          html: section.html.replace(matcher, replacement),
        }
      : section
  );

const extractHtmlBetweenRawMarkers = (
  html,
  { startMarker, endMarker, heading }
) => {
  if (!html) {
    return "";
  }

  const startIndex = html.search(startMarker);

  if (startIndex === -1) {
    return "";
  }

  const afterStartHtml = html.slice(startIndex);
  const endIndex = afterStartHtml.search(endMarker);
  const extractedHtml =
    endIndex === -1 ? afterStartHtml : afterStartHtml.slice(0, endIndex);

  return normalizeMovedSectionHtml(extractedHtml, heading);
};

const extractHtmlAfterMarker = (
  html,
  { startMarker, endMarker, heading }
) => {
  const blocks = getHtmlBlocks(html);
  const startIndex = blocks.findIndex((block) =>
    blockMatchesText(block, startMarker)
  );

  if (startIndex === -1) {
    return "";
  }

  const relativeEndIndex = blocks
    .slice(startIndex + 1)
    .findIndex((block) => blockMatchesText(block, endMarker));
  const endIndex =
    relativeEndIndex === -1 ? blocks.length : startIndex + 1 + relativeEndIndex;
  const extractedHtml = blocksToHtml(blocks.slice(startIndex + 1, endIndex));

  return normalizeMovedSectionHtml(extractedHtml, heading);
};

const normalizePublicationCategories = (sections, sectionKey, categories) =>
  sections.map((section) => {
    if (section.key !== sectionKey || !section.html || typeof DOMParser === "undefined") {
      return section;
    }

    const document = new DOMParser().parseFromString(section.html, "text/html");
    const normalizeList = (list) => {
      let orderedList = list;

      if (list.tagName === "UL") {
        orderedList = document.createElement("ol");

        Array.from(list.attributes).forEach(({ name, value }) => {
          orderedList.setAttribute(name, value);
        });
        orderedList.innerHTML = list.innerHTML;
        list.replaceWith(orderedList);
      }

      orderedList.setAttribute("start", "1");
      orderedList.classList.add("rsac-numbered-list");

      return orderedList;
    };

    document.body
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach((heading) => {
        const headingText = compactText(heading.textContent);
        const category = categories.find(({ matcher }) => matcher.test(headingText));

        if (!category) {
          return;
        }

        let categoryHeading = heading;

        if (heading.tagName !== "H3") {
          categoryHeading = document.createElement("h3");
          Array.from(heading.attributes).forEach(({ name, value }) => {
            categoryHeading.setAttribute(name, value);
          });
          heading.replaceWith(categoryHeading);
        }

        categoryHeading.textContent = category.label;
        categoryHeading.classList.add("rsac-publication-category");

        let list = categoryHeading.nextElementSibling;

        while (
          list &&
          !list.matches("ul, ol") &&
          !list.matches("h1, h2, h3, h4, h5, h6")
        ) {
          list = list.querySelector("ul, ol") || list.nextElementSibling;
        }

        if (!list || !list.matches("ul, ol")) {
          return;
        }

        normalizeList(list);
      });

    if (!document.body.querySelector(".rsac-publication-category")) {
      const lists = Array.from(document.body.querySelectorAll("ul, ol")).filter(
        (list) => !list.parentElement?.closest("li")
      );

      categories.forEach((category, index) => {
        const list = lists[index];

        if (!list) {
          return;
        }

        const heading = document.createElement("h3");
        heading.textContent = category.label;
        heading.classList.add("rsac-publication-category");
        list.parentElement?.insertBefore(heading, list);
        normalizeList(list);
      });
    }

    return {
      ...section,
      html: document.body.innerHTML.trim(),
    };
  });

const sectionHasMedia = (section) => {
  if (!section?.html || typeof DOMParser === "undefined") {
    return false;
  }

  const document = new DOMParser().parseFromString(section.html, "text/html");

  return Boolean(document.body.querySelector("img[src]"));
};

const sectionContainsText = (section, matcher) =>
  Boolean(
    section?.html &&
      getHtmlBlocks(section.html).some((block) => blockMatchesText(block, matcher))
  );

const trimSectionTail = (sections, { sectionKey, marker }) => {
  const sectionIndex = findSectionIndex(sections, sectionKey);

  if (sectionIndex === -1) {
    return sections;
  }

  const section = sections[sectionIndex];
  const split = splitHtmlAtText(section.html, marker);

  if (!split) {
    return sections;
  }

  return removeEmptySections(
    sections.map((item, index) =>
      index === sectionIndex
        ? {
            ...item,
            html: split.beforeHtml,
          }
        : item
    )
  );
};

const blockHasMedia = (block) => Boolean(block.querySelector("img[src]"));

const splitHtmlAtFirstMedia = (html) => {
  const blocks = getHtmlBlocks(html);
  const mediaIndex = blocks.findIndex(blockHasMedia);

  if (mediaIndex === -1) {
    return null;
  }

  return {
    beforeHtml: blocksToHtml(blocks.slice(0, mediaIndex)),
    mediaHtml: blocksToHtml(blocks.slice(mediaIndex)),
  };
};

const trimMediaTail = (sections, sectionKey) => {
  const sectionIndex = findSectionIndex(sections, sectionKey);

  if (sectionIndex === -1) {
    return sections;
  }

  const split = splitHtmlAtFirstMedia(sections[sectionIndex].html);

  if (!split) {
    return sections;
  }

  return removeEmptySections(
    sections.map((section, index) =>
      index === sectionIndex
        ? {
            ...section,
            html: split.beforeHtml,
          }
        : section
    )
  );
};

const moveMediaTail = (
  sections,
  {
    sourceKey,
    sourceKeys,
    destinationKey = "map-photos",
    destinationLabel = "Map/Photos",
    afterKey,
  }
) => {
  const sourceKeyInput = sourceKeys || sourceKey;
  const sectionKeys = Array.isArray(sourceKeyInput) ? sourceKeyInput : [sourceKeyInput];
  let sourceIndex = -1;
  let sourceSection = null;
  let split = null;

  for (const key of sectionKeys) {
    const candidateIndex = findSectionIndex(sections, key);

    if (candidateIndex === -1) {
      continue;
    }

    const candidateSection = sections[candidateIndex];
    const candidateSplit = splitHtmlAtFirstMedia(candidateSection.html);

    if (candidateSplit) {
      sourceIndex = candidateIndex;
      sourceSection = candidateSection;
      split = candidateSplit;
      break;
    }
  }

  if (!split) {
    return sections;
  }

  const nextSections = sections.map((section, index) =>
    index === sourceIndex
      ? {
          ...section,
          html: split.beforeHtml,
        }
      : section
  );

  return removeEmptySections(
    upsertSection(
      nextSections,
      {
        key: destinationKey,
        label: destinationLabel,
        html: split.mediaHtml,
      },
      afterKey || sourceSection.key
    )
  );
};

const movePreMediaToSection = (
  sections,
  { sourceKey, destinationKey, destinationLabel, heading, afterKey }
) => {
  const sourceIndex = findSectionIndex(sections, sourceKey);

  if (sourceIndex === -1) {
    return sections;
  }

  const sourceSection = sections[sourceIndex];
  const split = splitHtmlAtFirstMedia(sourceSection.html);

  if (!split?.beforeHtml || !split.mediaHtml) {
    return sections;
  }

  const movedHtml = normalizeMovedSectionHtml(
    split.beforeHtml,
    heading || destinationLabel
  );
  const nextSections = sections.map((section, index) =>
    index === sourceIndex
      ? {
          ...section,
          html: split.mediaHtml,
        }
      : section
  );

  return removeEmptySections(
    upsertSection(
      nextSections,
      {
        key: destinationKey,
        label: destinationLabel,
        html: movedHtml,
      },
      afterKey || sourceSection.key
    )
  );
};

const moveWholeSection = (
  sections,
  { sourceKey, destinationKey, destinationLabel, afterKey }
) => {
  const sourceIndex = findSectionIndex(sections, sourceKey);

  if (sourceIndex === -1) {
    return sections;
  }

  const sourceSection = sections[sourceIndex];

  if (!htmlHasContent(sourceSection.html)) {
    return sections;
  }

  const nextSections = sections.map((section, index) =>
    index === sourceIndex
      ? {
          ...section,
          html: "",
        }
      : section
  );

  return removeEmptySections(
    upsertSection(
      nextSections,
      {
        key: destinationKey,
        label: destinationLabel,
        html: sourceSection.html,
      },
      afterKey || sourceSection.key
    )
  );
};

const removeRedundantSectionHeadings = (sections) =>
  sections.map((section) => {
    if (!section.html || typeof DOMParser === "undefined") {
      return section;
    }

    const document = new DOMParser().parseFromString(section.html, "text/html");
    const label = normalizeCategoryText(section.label || section.title || section.key);
    const labelSingular = label.replace(/s$/, "");

    const isRedundantHeading = (element) => {
      if (!element || element.querySelector("img[src], table, ul, ol, a[href]")) {
        return false;
      }

      const text = compactText(element.textContent);

      if (!text || text.length > 120) {
        return false;
      }

      const normalized = normalizeCategoryText(text);

      return normalized === label || normalized.replace(/s$/, "") === labelSingular;
    };

    const removeEmptyAncestors = (element) => {
      let current = element;

      while (
        current &&
        current !== document.body &&
        !compactText(current.textContent) &&
        !current.querySelector("img[src], table, ul, ol, a[href]")
      ) {
        const parent = current.parentElement;
        current.remove();
        current = parent;
      }
    };

    const removeRedundantElement = (element) => {
      const parent = element.parentElement;

      element.remove();

      if (parent) {
        removeEmptyAncestors(parent);
      }
    };

    let firstChild = document.body.firstElementChild;
    while (firstChild && isRedundantHeading(firstChild)) {
      const nextChild = firstChild.nextElementSibling;
      firstChild.remove();
      firstChild = nextChild;
    }

    let lastChild = document.body.lastElementChild;
    while (lastChild && isRedundantHeading(lastChild)) {
      const previousChild = lastChild.previousElementSibling;
      lastChild.remove();
      lastChild = previousChild;
    }

    const firstHeading = document.body.querySelector("h1, h2, h3, h4, h5, h6");
    if (firstHeading && isRedundantHeading(firstHeading)) {
      removeRedundantElement(firstHeading);
    }

    const headings = Array.from(document.body.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const lastHeading = headings[headings.length - 1];
    if (lastHeading && isRedundantHeading(lastHeading)) {
      removeRedundantElement(lastHeading);
    }

    return {
      ...section,
      html: document.body.innerHTML.trim(),
    };
  });

const fillSerialNumberTables = (sections) =>
  sections.map((section) => {
    if (!section.html || typeof DOMParser === "undefined") {
      return section;
    }

    const document = new DOMParser().parseFromString(section.html, "text/html");
    fillSerialNumbersInDocument(document, section.key);

    return {
      ...section,
      html: document.body.innerHTML.trim(),
    };
  });

const normalizeDivisionSections = (page, sections) => {
  let normalized = sections;
  const cmsSectionLabels = new Map(
    sections.map((section) => [section.key, section.label]).filter(([, label]) => label)
  );
  const sectionLabel = (key) => cmsSectionLabels.get(key) || "";
  const allContentKeys = [
    "overview",
    "ongoing-projects",
    "completed-projects",
    "technical-reports",
    "publications",
    "research-paper-published",
    "research-papers",
    "map-photos",
    "data-bank",
    "software",
    "hardware",
    "training-programmes",
    "training-hostel",
    "training-hostel-photos",
    "mtech",
  ];

  if (page.slug === "agriculture-resources-division1") {
    normalized = moveSectionTail(normalized, {
      sourceKeys: ["overview"],
      destinationKey: "map-photos",
      destinationLabel: sectionLabel("map-photos"),
      marker: /Related Photos/i,
      heading: sectionLabel("map-photos"),
      afterKey: "research-papers",
    });
  }

  if (page.slug === "computer-image-processing-division") {
    normalized = moveSectionTail(normalized, {
      sourceKeys: allContentKeys.filter((key) => key !== "map-photos"),
      destinationKey: "map-photos",
      destinationLabel: sectionLabel("map-photos"),
      marker: /Related Links/i,
      heading: sectionLabel("map-photos"),
      afterKey: "research-papers",
    });
  }

  if (page.slug === "earth-resources-division1") {
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["overview", "ongoing-projects"],
      destinationKey: "completed-projects",
      destinationLabel: sectionLabel("completed-projects"),
      startMarker: /Generation of Meso Level/i,
      endMarker: /LIST OF TECHNICAL REPORTS/i,
      heading: sectionLabel("completed-projects"),
      afterKey: "ongoing-projects",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: [
        "technical-reports",
        "research-paper-published",
        "research-papers",
        "completed-projects",
        "overview",
      ],
      afterKey: "technical-reports",
    });
  }

  if (page.slug === "forest-resources-ecology-division") {
    normalized = replaceHeadingsInSection(normalized, "map-photos", [
      { matcher: /^Fields Photos$/i, label: localizeOfficialText("Field Outputs") },
      { matcher: /^Field Photos$/i, label: localizeOfficialText("Field Outputs") },
    ]);
  }

  if (page.slug === "groundwater-resources-division1") {
    const reportSectionLabel = sectionLabel("publications");

    normalized = moveSectionRange(normalized, {
      sourceKeys: [
        "overview",
        "publications",
        "research-papers",
        "technical-reports",
        "map-photos",
      ],
      destinationKey: "publications",
      destinationLabel: reportSectionLabel,
      startMarker: (block) =>
        isGroundwaterPublicationTableBlock(block) ||
        /Some results of ground water targeting/i.test(
          compactText(block.textContent)
        ),
      endMarker: /Rain Water Harvesting Project/i,
      heading: reportSectionLabel,
      afterKey: "completed-projects",
    });
    normalized = moveSectionTail(normalized, {
      sourceKeys: [
        "overview",
        "research-papers",
        "technical-reports",
        "map-photos",
      ],
      destinationKey: "publications",
      destinationLabel: reportSectionLabel,
      marker: /Rain Water Harvesting Project/i,
      heading: sectionLabel("technical-reports"),
      afterKey: "publications",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: ["publications", "technical-reports"],
      afterKey: "publications",
    });
    normalized = trimSectionTail(normalized, {
      sectionKey: "map-photos",
      marker:
        /Some results of ground water targeting|Rain Water Harvesting Project/i,
    });
  }

  if (page.slug === "geo-spatial-data-bank-division1") {
    normalized = moveMediaTail(normalized, {
      sourceKey: "research-papers",
      afterKey: "technical-reports",
    });
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["overview", "data-bank", "completed-projects"],
      destinationKey: "ongoing-projects",
      destinationLabel: sectionLabel("ongoing-projects"),
      startMarker: /Ongoing Scientific Projects/i,
      endMarker: /Completed Projects/i,
      heading: sectionLabel("ongoing-projects"),
      afterKey: "data-bank",
    });
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["overview", "data-bank"],
      destinationKey: "completed-projects",
      destinationLabel: sectionLabel("completed-projects"),
      startMarker: /Completed Projects/i,
      endMarker: /Somendra Singh|Ram Chandra\s*\(2019\)/i,
      heading: sectionLabel("completed-projects"),
      afterKey: "ongoing-projects",
    });
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["overview", "data-bank", "completed-projects"],
      destinationKey: "research-papers",
      destinationLabel: sectionLabel("research-papers"),
      startMarker: /Somendra Singh/i,
      endMarker: /Ram Chandra\s*\(\s*2019\s*\).*Rejuvenation and Revival/i,
      heading: sectionLabel("research-papers"),
      afterKey: "completed-projects",
    });
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["overview", "data-bank", "research-papers"],
      destinationKey: "technical-reports",
      destinationLabel: sectionLabel("technical-reports"),
      startMarker: /Ram Chandra\s*\(\s*2019\s*\).*Rejuvenation and Revival/i,
      endMarker: (block) => Boolean(block.querySelector("img[src]")),
      heading: sectionLabel("technical-reports"),
      afterKey: "research-papers",
    });
    normalized = moveMediaTail(normalized, {
      sourceKey: "research-paper-published",
      afterKey: "technical-reports",
    });
    const overviewSection = normalized.find((section) => section.key === "overview");

    if (
      !sectionContainsText(
        overviewSection,
        /Databank with different types of maps/i
      )
    ) {
      const facilitiesHtml = extractHtmlAfterMarker(page.html, {
        startMarker: /Resources\s*\/\s*Facilities Available/i,
        endMarker: (block) => Boolean(block.querySelector("img[src]")),
        heading: localizeOfficialText("Facilities Available"),
      });

      if (htmlHasContent(facilitiesHtml)) {
        normalized = replaceTextInSection(
          normalized,
          "overview",
          /Resources\s*\/\s*Facilities Available\s*:?/gi
        );
        normalized = upsertSection(
          normalized,
          {
            key: "overview",
            label: overviewSection?.label || sectionLabel("overview"),
            html: facilitiesHtml,
          },
          "overview"
        );
      } else {
        normalized = moveSectionTail(normalized, {
          sourceKeys: ["data-bank", "completed-projects"],
          destinationKey: "overview",
          destinationLabel: overviewSection?.label || sectionLabel("overview"),
          marker: /Facilities Available|Databank with different types of maps/i,
          heading: localizeOfficialText("Facilities Available"),
          afterKey: "overview",
        });
      }
    }
    normalized = trimSectionTail(normalized, {
      sectionKey: "data-bank",
      marker: /Facilities Available|Databank with different types of maps/i,
    });
    normalized = trimSectionTail(normalized, {
      sectionKey: "completed-projects",
      marker: /Facilities Available|Databank with different types of maps/i,
    });
    normalized = trimMediaTail(normalized, "technical-reports");
  }

  if (page.slug === "landuse-amp;-urban-survey-division1") {
    normalized = moveSectionRange(normalized, {
      sourceKeys: [
        "overview",
        "research-paper-published",
        "research-papers",
        "map-photos",
      ],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      startMarker: /Book\/Chapters Published from International Publisher/i,
      endMarker: (block) => Boolean(block.querySelector("img[src]")),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = sectionHasMedia(
      normalized.find((section) => section.key === "research-papers")
    )
      ? moveMediaTail(normalized, {
          sourceKeys: "research-papers",
          afterKey: "research-paper-published",
        })
      : moveWholeSection(normalized, {
          sourceKey: "research-papers",
          destinationKey: "research-paper-published",
          destinationLabel: sectionLabel("research-paper-published"),
          afterKey: "technical-reports",
        });
    normalized = moveMediaTail(normalized, {
      sourceKeys: "research-paper-published",
      afterKey: "research-paper-published",
    });
    normalized = movePreMediaToSection(normalized, {
      sourceKey: "map-photos",
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = normalizePublicationCategories(
      normalized,
      "research-paper-published",
      [
        {
          matcher: /^Book\/Chapters Published from International Publisher$/i,
          label: "Book/Chapters Published from International Publisher",
        },
        {
          matcher:
            /Research Papers?\s+Presented?\s*\/?\s*Published.*International.*National.*Conference/i,
          label:
            "Research Papers Presented/Published in International and National Conferences, Seminars, Workshops and Symposia",
        },
        {
          matcher: /Research Papers?\s+Published in International Journals?/i,
          label: "Research Papers Published in International Journals",
        },
        {
          matcher: /Research Papers?\s+Published in National Journals?/i,
          label: "Research Papers Published in National Journals",
        },
        {
          matcher:
            /Research Papers?\s+presented\s*\/?\s*Published in National Conferences?/i,
          label:
            "Research Papers Presented/Published in National Conferences, Seminars, Workshops and Symposia",
        },
      ]
    );
  }

  if (page.slug === "soil-resources-division1") {
    normalized = moveSectionRange(normalized, {
      sourceKeys: [
        "overview",
        "research-paper-published",
        "research-papers",
        "map-photos",
      ],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      startMarker: /Singh Kaushlendra,\s*Yadav|Assessment of soil organic carbon status/i,
      endMarker: (block) => Boolean(block.querySelector("img[src]")),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: "research-papers",
      afterKey: "research-paper-published",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: "research-paper-published",
      afterKey: "research-paper-published",
    });
    normalized = moveSectionTail(normalized, {
      sourceKeys: ["map-photos"],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      marker: /Singh Kaushlendra,\s*Yadav|Assessment of soil organic carbon status/i,
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = movePreMediaToSection(normalized, {
      sourceKey: "map-photos",
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = trimSectionTail(normalized, {
      sectionKey: "map-photos",
      marker:
        /Research Papers? Published|Singh Kaushlendra,\s*Yadav|Assessment of soil organic carbon status/i,
    });
  }

  if (page.slug === "surface-water-resources-division1") {
    normalized = moveSectionRange(normalized, {
      sourceKeys: [
        "overview",
        "research-paper-published",
        "research-papers",
        "map-photos",
      ],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      startMarker: /Paper on .*3-D Reconstruction|3-D Reconstruction Of Heritage Site/i,
      endMarker: (block) => Boolean(block.querySelector("img[src]")),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: "research-papers",
      afterKey: "research-paper-published",
    });
    normalized = moveMediaTail(normalized, {
      sourceKeys: "research-paper-published",
      afterKey: "research-paper-published",
    });
    normalized = moveSectionTail(normalized, {
      sourceKeys: ["map-photos"],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      marker: /Paper on .*3-D Reconstruction|3-D Reconstruction Of Heritage Site/i,
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = movePreMediaToSection(normalized, {
      sourceKey: "map-photos",
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      heading: sectionLabel("research-paper-published"),
      afterKey: "technical-reports",
    });
    normalized = trimSectionTail(normalized, {
      sectionKey: "map-photos",
      marker:
        /Research Papers? Published|Paper on .*3-D Reconstruction|3-D Reconstruction Of Heritage Site/i,
    });
  }

  if (/^training-division-?$/.test(page.slug)) {
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["training-programmes"],
      destinationKey: "overview",
      destinationLabel: sectionLabel("overview"),
      startMarker: /Completed Training Programme in last 05 year/i,
      endMarker: /Calendar of Training Programmes/i,
      heading: localizeOfficialText("Completed Training Programme in last 05 year"),
      afterKey: "overview",
    });
    normalized = moveSectionRange(normalized, {
      sourceKeys: ["scientific-manpower", ...allContentKeys],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      startMarker:
        /List of Research Papers|Ashwani K\.\s*Srivastava|Detection of change in cropping pattern/i,
      endMarker: /LIST OF TECHNICAL REPORTS/i,
      heading: sectionLabel("research-paper-published"),
      afterKey: "scientific-manpower",
    });
    normalized = moveSectionTail(normalized, {
      sourceKeys: [
        "overview",
        "map-photos",
        "training-hostel-photos",
        "training-hostel",
        "training-programmes",
        "scientific-manpower",
      ],
      destinationKey: "research-paper-published",
      destinationLabel: sectionLabel("research-paper-published"),
      marker:
        /List of Research Papers|Ashwani K\.\s*Srivastava|Detection of change in cropping pattern/i,
      heading: sectionLabel("research-paper-published"),
      afterKey: "scientific-manpower",
    });
    if (
      !sectionContainsText(
        normalized.find((section) => section.key === "research-paper-published"),
        /Detection of change in cropping pattern|Ashwani K\.\s*Srivastava/i
      )
    ) {
      const researchPapersHtml =
        extractHtmlBetweenRawMarkers(page.html, {
          startMarker:
            /<h[1-6][^>]*>\s*List of Research Papers\s*<\/h[1-6]>/i,
          endMarker:
            /<h[1-6][^>]*>\s*LIST OF TECHNICAL REPORTS\s*<\/h[1-6]>/i,
          heading: sectionLabel("research-paper-published"),
        }) ||
        extractHtmlAfterMarker(page.html, {
          startMarker: /List of Research Papers/i,
          endMarker: /LIST OF TECHNICAL REPORTS/i,
          heading: sectionLabel("research-paper-published"),
        });

      normalized = upsertSection(
        normalized,
        {
          key: "research-paper-published",
          label: sectionLabel("research-paper-published"),
          html: researchPapersHtml,
        },
        "scientific-manpower"
      );
    }
    ["overview", "training-programmes"].forEach((sectionKey) => {
      normalized = replaceTextInSection(
        normalized,
        sectionKey,
        /TRAINING PROGRAMMES CONDUCTED DURING THE PERIOD BETWEEN 2016-2021/gi,
        localizeOfficialText("Completed Training Programme in last 05 year")
      );
      normalized = replaceTextInSection(
        normalized,
        sectionKey,
        /TANTATIVE PROPOSED TRAINING PROGRAMMES/gi,
        localizeOfficialText("Calendar of Training Programmes in the year 2021-22")
      );
      normalized = replaceTextInSection(
        normalized,
        sectionKey,
        /Calendar of Training Programmes for the Year 2021-22/gi,
        localizeOfficialText("Calendar of Training Programmes in the year 2021-22")
      );
    });
    // The Hindi scrape lost the tab-panel markup around the photo gallery, so
    // the gallery block lands at the end of the overview tab instead of
    // Map/Photos (the English body keeps its panel structure and is not
    // affected). Move any trailing media out of the overview into Map/Photos
    // so both languages show the gallery under the same tab.
    normalized = moveMediaTail(normalized, {
      sourceKeys: ["overview"],
      afterKey: "training-hostel",
    });
  }

  normalized = removeRedundantSectionHeadings(normalized);
  normalized = fillSerialNumberTables(normalized);

  return removeEmptySections(normalized);
};

const splitLongPlainParagraphs = (document) => {
  document.body.querySelectorAll("p").forEach((paragraph) => {
    if (paragraph.querySelector("*")) return;

    const text = compactText(paragraph.textContent);
    if (text.length < 1000) return;

    const sentenceParts = text.split(/([.!?\u0964;]+)(?:\s+|$)/u);
    const sentences = [];
    for (let index = 0; index < sentenceParts.length; index += 2) {
      const sentence = compactText(
        `${sentenceParts[index] || ""}${sentenceParts[index + 1] || ""}`
      );
      if (sentence) sentences.push(sentence);
    }
    if (sentences.length < 2) return;

    const chunks = [];
    let current = "";
    sentences.forEach((sentence) => {
      const next = current ? `${current} ${sentence}` : sentence;
      if (current.length >= 360 && next.length > 720) {
        chunks.push(current);
        current = sentence;
      } else {
        current = next;
      }
    });
    if (current) chunks.push(current);
    if (chunks.length < 2) return;

    if (chunks.at(-1).length < 220 && chunks.length > 1) {
      chunks.splice(-2, 2, `${chunks.at(-2)} ${chunks.at(-1)}`);
    }

    const fragment = document.createDocumentFragment();
    chunks.forEach((chunk, index) => {
      const nextParagraph = paragraph.cloneNode(false);
      if (index > 0) nextParagraph.removeAttribute("id");
      nextParagraph.classList.add("rsac-prose-chunk");
      nextParagraph.textContent = chunk;
      fragment.appendChild(nextParagraph);
    });
    paragraph.replaceWith(fragment);
  });
};

const getPseudoListMarker = (value) => {
  const text = String(value || "");
  const ordered = text.match(
    /^\s*(?:\((\d{1,3})\)|(\d{1,3})[.)])(?!\d)\s*/u
  );
  if (ordered && text.slice(ordered[0].length).trim()) {
    return {
      type: "ordered",
      length: ordered[0].length,
      value: Number(ordered[1] || ordered[2]),
    };
  }

  const bullet = text.match(/^\s*[•▪●◦]\s+/u);
  return bullet
    ? { type: "bullet", length: bullet[0].length, value: null }
    : null;
};

const removeLeadingText = (element, characterCount) => {
  const walker = element.ownerDocument.createTreeWalker(element, 4);
  let remaining = characterCount;
  let node = walker.nextNode();

  while (node && remaining > 0) {
    const length = node.nodeValue?.length || 0;
    if (length <= remaining) {
      node.nodeValue = "";
      remaining -= length;
    } else {
      node.nodeValue = node.nodeValue.slice(remaining);
      remaining = 0;
    }
    node = walker.nextNode();
  }
};

const normalizePseudoListParagraphs = (document) => {
  Array.from(document.body.querySelectorAll("p")).forEach((paragraph) => {
    if (!paragraph.isConnected || paragraph.closest("li, td, th")) return;
    if (paragraph.querySelectorAll("br").length >= 3) return;
    const firstMarker = getPseudoListMarker(paragraph.textContent);
    if (!firstMarker) return;

    const list = document.createElement(firstMarker.type === "ordered" ? "ol" : "ul");
    paragraph.before(list);
    let current = paragraph;

    while (current?.tagName === "P") {
      const marker = getPseudoListMarker(current.textContent);
      if (!marker || marker.type !== firstMarker.type) break;

      const next = current.nextElementSibling;
      removeLeadingText(current, marker.length);
      const item = document.createElement("li");
      if (marker.type === "ordered" && Number.isFinite(marker.value)) {
        item.value = marker.value;
      }
      while (current.firstChild) item.appendChild(current.firstChild);
      list.appendChild(item);
      current.remove();
      current = next;
    }
  });
};

const normalizeBreakSeparatedParagraphs = (document) => {
  Array.from(document.body.querySelectorAll("p")).forEach((paragraph) => {
    if (paragraph.closest("li, td, th")) return;
    const breaks = Array.from(paragraph.querySelectorAll("br"));
    if (breaks.length < 3 || compactText(paragraph.textContent).length < 180) {
      return;
    }

    const fragments = [];
    let startContainer = paragraph;
    let startOffset = 0;

    breaks.forEach((lineBreak) => {
      const range = document.createRange();
      range.setStart(startContainer, startOffset);
      range.setEndBefore(lineBreak);
      fragments.push(range.cloneContents());

      const nextRange = document.createRange();
      nextRange.setStartAfter(lineBreak);
      startContainer = nextRange.startContainer;
      startOffset = nextRange.startOffset;
    });

    const finalRange = document.createRange();
    finalRange.setStart(startContainer, startOffset);
    finalRange.setEnd(paragraph, paragraph.childNodes.length);
    fragments.push(finalRange.cloneContents());

    const meaningfulFragments = fragments.filter(
      (fragment) =>
        compactText(fragment.textContent) ||
        fragment.querySelector("img, a, video, iframe")
    );
    if (meaningfulFragments.length < 3) return;

    const stack = document.createElement("div");
    stack.className = "rsac-detail-stack";
    if (paragraph.id) stack.id = paragraph.id;

    meaningfulFragments.forEach((fragment) => {
      const line = paragraph.cloneNode(false);
      line.removeAttribute("id");
      line.classList.add("rsac-detail-line");
      line.appendChild(fragment);

      const marker = getPseudoListMarker(line.textContent);
      if (marker?.type === "ordered") {
        const heading = document.createElement("h4");
        heading.className = "rsac-detail-heading";
        while (line.firstChild) heading.appendChild(line.firstChild);
        stack.appendChild(heading);
      } else {
        stack.appendChild(line);
      }
    });
    paragraph.replaceWith(stack);
  });
};

const normalizeRichContentTables = (document) => {
  document.body.querySelectorAll("table").forEach((table) => {
    table.classList.add("rsac-data-table");
    const columnCount = Math.max(
      0,
      ...Array.from(table.rows).map((row) => row.cells.length)
    );
    table.classList.add(
      columnCount >= 3 ? "rsac-data-table--wide" : "rsac-data-table--compact"
    );
    table.querySelectorAll("th:not([scope])").forEach((heading) => {
      heading.setAttribute("scope", "col");
    });

    if (table.parentElement?.classList.contains("rsac-table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", "rsac-table-scroll");
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Data table");
    wrapper.setAttribute("tabindex", "0");
    table.before(wrapper);
    wrapper.appendChild(table);
  });
};

const enhanceRichContentHtml = (
  html,
  sectionKey,
  { language = "en" } = {}
) => {
  if (typeof DOMParser === "undefined") {
    return html;
  }

  const parsedDocument = new DOMParser().parseFromString(html, "text/html");

  // The legacy source embeds a second tab strip inside the article body.
  // React already renders the accessible section tabs for these pages.
  removeLegacyImportedTabStrips(parsedDocument);

  // Scraped citations wrap stray separators in <strong>/<em> — a bold "," or ":"
  // sitting between author names — which reads as a stray comma on the page.
  // Unwrap emphasis whose text is only punctuation/space so it renders as plain
  // text; the punctuation stays, so author lists keep their separators. Then drop
  // any list item or paragraph that is *only* punctuation (a lone "," bullet from
  // the source), leaving real, media, and inline separators untouched.
  const PUNCTUATION_ONLY = /^[\s,.;:।|/()[\]{}\-–—•·]+$/;
  parsedDocument.body
    .querySelectorAll("strong, b, em, i, u")
    .forEach((emphasis) => {
      if (emphasis.querySelector("img, a, video, iframe")) {
        return;
      }
      const text = emphasis.textContent || "";
      if (text.trim() !== "" && PUNCTUATION_ONLY.test(text)) {
        emphasis.replaceWith(parsedDocument.createTextNode(text));
      }
    });
  parsedDocument.body.querySelectorAll("li, p").forEach((element) => {
    if (element.querySelector("img, a, video, iframe, source, br")) {
      return;
    }
    const text = element.textContent || "";
    if (text.trim() === "" || PUNCTUATION_ONLY.test(text)) {
      element.remove();
    }
  });

  normalizePseudoListParagraphs(parsedDocument);
  normalizeBreakSeparatedParagraphs(parsedDocument);
  splitLongPlainParagraphs(parsedDocument);

  parsedDocument.body.querySelectorAll("a[href]").forEach((link) => {
    const sourceHref = link.getAttribute("href")?.trim() || "";
    const href = rewriteOfficialMedia(sourceHref);
    if (href && href !== sourceHref) {
      link.setAttribute("href", href);
    }
    const isDownload =
      link.hasAttribute("download") ||
      /\.(?:pdf|docx?|xlsx?|pptx?|zip|csv|html?)(?:$|[?#])/i.test(href);
    let isExternal = false;

    if (/^https?:\/\//i.test(href)) {
      try {
        isExternal =
          new URL(href, window.location.href).origin !== window.location.origin;
      } catch {
        isExternal = true;
      }
    }

    if (isExternal || isDownload) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  });

  parsedDocument.body.querySelectorAll("img[src]").forEach((image) => {
    const existingLink = image.closest("a[href]");
    const title = getReadableMediaTitle(
      image.getAttribute("title") || image.getAttribute("alt") || "",
      language
    );

    if (existingLink) {
      existingLink.classList.add("rsac-media-link");
      if (title) {
        existingLink.setAttribute("title", title);
      } else {
        existingLink.removeAttribute("title");
        existingLink.setAttribute("aria-label", localizeOfficialText("Open in new tab"));
      }
      return;
    }

    const link = parsedDocument.createElement("a");

    link.setAttribute("href", image.getAttribute("src"));
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    link.setAttribute("class", "rsac-media-link");
    link.setAttribute(
      "aria-label",
      title
        ? `${localizeOfficialText("Open in new tab")}: ${title}`
        : localizeOfficialText("Open in new tab")
    );
    if (title) link.setAttribute("title", title);

    image.replaceWith(link);
    link.appendChild(image);

    if (title) {
      const caption = parsedDocument.createElement("span");
      caption.setAttribute("class", "rsac-media-caption");
      caption.textContent = title;
      link.appendChild(caption);
    }
  });

  parsedDocument.body.querySelectorAll("a.rsac-media-link").forEach((link) => {
    const image = link.querySelector("img[src]");
    const href = link.getAttribute("href")?.trim() || "";
    const imageSource = image?.getAttribute("src")?.trim() || "";
    const hasCaption = link.querySelector(".rsac-media-caption");
    const title = getReadableMediaTitle(
      link.getAttribute("title") ||
        image?.getAttribute("title") ||
        image?.getAttribute("alt") ||
        "",
      language
    );

    if (
      image &&
      /\.html?(?:$|[?#])/i.test(href) &&
      /^(?:\/official-media\/|\/cms-media\/)/i.test(href)
    ) {
      link.classList.add("rsac-interactive-thumbnail");
      link.setAttribute(
        "aria-label",
        title || localizeOfficialText("Open interactive content")
      );
      return;
    }

    if (/\.(?:mp4|m4v|webm|ogv|mov)(?:$|[?#])/i.test(href)) {
      // A locally mirrored video linked from a thumbnail: play it in place
      // instead of navigating away (the image-only look made videos read as
      // photos, and the Lightbox cannot play them).
      const figure = parsedDocument.createElement("figure");
      figure.setAttribute("class", "rsac-video-figure");

      const video = parsedDocument.createElement("video");
      video.setAttribute("class", "rsac-video-embed");
      video.setAttribute("controls", "");
      video.setAttribute("preload", "metadata");
      video.setAttribute("playsinline", "");
      video.setAttribute("src", href);
      if (imageSource && imageSource !== href) {
        video.setAttribute("poster", imageSource);
      }
      const localizedVideoTitle = title;
      if (localizedVideoTitle) {
        video.setAttribute("title", localizedVideoTitle);
        video.setAttribute("aria-label", localizedVideoTitle);

        const figcaption = parsedDocument.createElement("figcaption");
        figcaption.setAttribute("class", "rsac-video-figcaption");
        figcaption.textContent = localizedVideoTitle;
        figure.appendChild(figcaption);
      }

      figure.insertBefore(video, figure.firstChild);
      link.replaceWith(figure);
      return;
    }

    if (imageSource && href && imageSource !== href) {
      link.classList.add("rsac-media-link--preview");
    }

    if (!hasCaption && title) {
      const caption = parsedDocument.createElement("span");
      caption.setAttribute("class", "rsac-media-caption");
      caption.textContent = title;
      link.appendChild(caption);
      link.setAttribute("title", title);
    } else if (!title) {
      hasCaption?.remove();
      link.removeAttribute("title");
      link.setAttribute("aria-label", localizeOfficialText("Open in new tab"));
      image?.setAttribute("alt", "");
    }
  });

  // Free inline players from single-child paragraph wrappers, then pack each
  // run of consecutive players into a responsive grid so several videos sit
  // side by side instead of stacking full width down the page.
  parsedDocument.body.querySelectorAll("p").forEach((paragraph) => {
    if (
      paragraph.children.length === 1 &&
      paragraph.firstElementChild.matches("figure.rsac-video-figure") &&
      !compactText(
        Array.from(paragraph.childNodes)
          .filter((node) => node.nodeType === 3)
          .map((node) => node.textContent)
          .join("")
      )
    ) {
      paragraph.replaceWith(paragraph.firstElementChild);
    }
  });

  const isVideoRunFiller = (node) =>
    (node.nodeType === 3 && !node.textContent.trim()) ||
    (node.nodeType === 1 &&
      (node.tagName === "BR" ||
        (node.tagName === "P" &&
          !compactText(node.textContent) &&
          !node.querySelector("img, video, iframe, table"))));

  const groupedVideoFigures = new Set();
  parsedDocument.body
    .querySelectorAll("figure.rsac-video-figure")
    .forEach((figure) => {
      if (groupedVideoFigures.has(figure)) {
        return;
      }
      const run = [figure];
      const fillers = [];
      let node = figure.nextSibling;
      while (node) {
        if (node.nodeType === 1 && node.matches("figure.rsac-video-figure")) {
          run.push(node);
          node = node.nextSibling;
          continue;
        }
        if (isVideoRunFiller(node)) {
          fillers.push(node);
          node = node.nextSibling;
          continue;
        }
        break;
      }
      run.forEach((item) => groupedVideoFigures.add(item));
      if (run.length < 2) {
        return;
      }
      const grid = parsedDocument.createElement("div");
      grid.setAttribute("class", "rsac-video-grid");
      figure.parentNode.insertBefore(grid, figure);
      run.forEach((item) => grid.appendChild(item));
      fillers.forEach((filler) => filler.remove());
    });

  fillSerialNumbersInDocument(parsedDocument, sectionKey);
  normalizeRichContentTables(parsedDocument);

  parsedDocument.body.querySelectorAll("ul, ol").forEach((list) => {
    const items = Array.from(list.children).filter((child) => child.tagName === "LI");
    const longList = items.length >= 4;
    const citationLike = items.some((item) =>
      /\(\d{4}\)|\bpaper\b|\breport\b|\bproject\b/i.test(compactText(item.textContent))
    );

    if (longList && (citationLike || sectionKey === "completed-projects")) {
      list.classList.add("rsac-numbered-list");
    } else if (list.tagName === "UL") {
      list.classList.add("rsac-bullet-list");
    } else {
      list.classList.add("rsac-ordered-list");
    }
  });

  // Imported division galleries use two shapes: some images are direct links,
  // while others are wrapped in otherwise-empty paragraphs. Normalize those
  // wrappers before identifying gallery runs so every image gets the same card.
  parsedDocument.body.querySelectorAll("p").forEach((paragraph) => {
    const onlyChild = paragraph.firstElementChild;
    const ownText = Array.from(paragraph.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join(" ");

    if (
      paragraph.children.length === 1 &&
      onlyChild?.matches("a.rsac-media-link") &&
      !compactText(ownText)
    ) {
      paragraph.replaceWith(onlyChild);
    }
  });

  Array.from(parsedDocument.body.querySelectorAll("div"))
    .reverse()
    .forEach((container) => {
      const children = Array.from(container.children).filter(
        (child) =>
          child.matches("a.rsac-media-link, img[src], figure, div") &&
          (child.matches("a.rsac-media-link, img[src]") || child.querySelector("img[src]"))
      );
      const meaningfulChildren = Array.from(container.children).filter(
        (child) => compactText(child.textContent) || child.querySelector("img[src], a[href]")
      );
      const ownText = Array.from(container.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join(" ");

      if (
        children.length >= 2 &&
        children.length === meaningfulChildren.length &&
        !compactText(ownText)
      ) {
        container.classList.add("rsac-media-grid");
        children.forEach((child) => child.classList.add("rsac-media-item"));
      }
    });

  const isDirectMediaItem = (element) =>
    element.matches("a.rsac-media-link, img[src]") ||
    (element.matches("figure:not(.rsac-video-figure)") && Boolean(element.querySelector("img[src]")));

  // A CMS editor may paste several image links without a surrounding div. Pack
  // each uninterrupted run into a grid while keeping headings as group breaks.
  [parsedDocument.body, ...parsedDocument.body.querySelectorAll("div:not(.rsac-media-grid)")]
    .forEach((parent) => {
      let run = [];
      const flushRun = () => {
        if (run.length >= 2) {
          const grid = parsedDocument.createElement("div");
          grid.setAttribute("class", "rsac-media-grid");
          parent.insertBefore(grid, run[0]);
          run.forEach((item) => {
            item.classList.add("rsac-media-item");
            grid.appendChild(item);
          });
        }
        run = [];
      };

      Array.from(parent.children).forEach((child) => {
        if (isDirectMediaItem(child)) {
          run.push(child);
        } else {
          flushRun();
        }
      });
      flushRun();
    });

  return parsedDocument.body.innerHTML;
};

const OfficialHtmlContent = ({
  html,
  pageTitle,
  baseTitle,
  pageSlug,
  sectionKey,
  stripProfiles = false,
  stripMediaHeadings = true,
}) => {
  const { language } = useLanguage();
  const contentRef = useRef(null);
  const [lightbox, setLightbox] = useState(null);
  const enhancedHtml = useMemo(() => {
    const built = enhanceRichContentHtml(
      sanitizeOfficialHtml(html, {
        pageTitle,
        baseTitle,
        stripProfiles,
        stripMediaHeadings,
      }),
      sectionKey,
      { pageTitle, language }
    );
    return built;
  }, [html, pageTitle, baseTitle, sectionKey, stripProfiles, stripMediaHeadings, language]);

  // Open Map/Photos (and any body image) in the shared Lightbox with prev/next
  // instead of leaving the site for the raw file. Links that lead to a
  // non-image target (a PDF, a mirrored mini-app page) keep their normal
  // anchor behaviour — the Lightbox can only display images.
  const imageHrefPattern = /\.(?:jpe?g|png|gif|webp|svg|avif)(?:$|[?#])/i;
  const handleContentClick = (event) => {
    const link = event.target.closest("a.rsac-media-link");
    const clickedImg = event.target.closest("img") || link?.querySelector("img");

    if (!clickedImg && !link) {
      return;
    }

    const linkHref = link?.getAttribute("href") || "";
    if (link && linkHref && !imageHrefPattern.test(linkHref)) {
      return;
    }

    const root = contentRef.current;
    if (!root) return;

    const imgs = Array.from(root.querySelectorAll("img"));
    if (!imgs.length) return;

    event.preventDefault();

    const images = imgs.map((img) => {
      const href = img.closest("a.rsac-media-link")?.getAttribute("href");
      return {
        src: href && imageHrefPattern.test(href) ? href : img.src,
        caption: img.getAttribute("alt") || "",
      };
    });
    const startIndex = Math.max(0, imgs.indexOf(clickedImg));

    setLightbox({ images, startIndex });
  };

  return (
    <>
      <div
        ref={contentRef}
        onClick={handleContentClick}
        className={`rsac-rich-content${pageSlug === "library1" ? " rsac-library-content" : ""}`}
        dangerouslySetInnerHTML={{ __html: enhancedHtml }}
      />
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};

const flexibleGridColumns = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

const flexibleBlockType = (block) =>
  String(block?.type || block?.kind || "rich_text")
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_");

const flexibleColumns = (value, fallback = 3) =>
  flexibleGridColumns[Math.min(4, Math.max(1, Number(value) || fallback))];

const flexibleItems = (value) => (Array.isArray(value) ? value : []);

const flexibleText = (value, language) =>
  localizeOfficialText(String(value || ""), language);

const FlexibleHeading = ({ block, language }) => {
  const heading = block.heading || block.title;
  if (!heading || block.showHeading === false) {
    return null;
  }

  return (
    <div className="mb-4">
      {block.eyebrow && (
        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#0b6fa4]">
          {flexibleText(block.eyebrow, language)}
        </p>
      )}
      <h2 className="text-xl font-extrabold leading-snug text-[#102f46] sm:text-2xl">
        {flexibleText(heading, language)}
      </h2>
      {block.intro && (
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
          {flexibleText(block.intro, language)}
        </p>
      )}
    </div>
  );
};

const FlexibleLink = ({ item, language, className = "" }) => {
  const href = item?.url || item?.path || item?.href || "";
  const label = flexibleText(
    item?.linkLabel || item?.label || item?.title || "Open",
    language
  );
  if (!href) {
    return null;
  }

  const content = (
    <>
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </>
  );
  const classes = `inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white no-underline transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] ${className}`;

  return /^\/(?!\/)/.test(href) && !/^\/sites\//i.test(href) ? (
    <Link to={href} className={classes}>
      {content}
    </Link>
  ) : (
    <a
      href={href}
      className={classes}
      target={/^https?:/i.test(href) ? "_blank" : undefined}
      rel={/^https?:/i.test(href) ? "noreferrer" : undefined}
    >
      {content}
    </a>
  );
};

const flexibleBlockDisplayProps = (block, className) => ({
  className: `${className} cms-flexible-block`,
  "data-cms-text-size": block.textSize || "normal",
  "data-cms-media-size": block.mediaSize || "normal",
  "data-cms-spacing": block.spacing || "normal",
});

const FlexibleCmsBlocks = ({ blocks, page }) => {
  const { language } = useLanguage();
  const visibleBlocks = flexibleItems(blocks).filter(
    (block) => block && block.hidden !== true && block.enabled !== false
  );

  if (!visibleBlocks.length) {
    return null;
  }

  return (
    <div className="cms-flexible-layout" data-cms-layout="flexible">
      {visibleBlocks.map((block, blockIndex) => {
        const type = flexibleBlockType(block);
        const key = block.id || block.key || `${type}-${blockIndex}`;
        const items = flexibleItems(block.items);
        const shellClass = block.variant === "plain"
          ? "min-w-0"
          : "min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5";
        const shellProps = flexibleBlockDisplayProps(block, shellClass);

        if (["rich_text", "text", "html", "body"].includes(type)) {
          const html = block.html || block.body || block.text || "";
          if (!html) return null;
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <OfficialHtmlContent
                html={html}
                pageTitle={block.heading || page.title}
                sectionKey={page.sectionKey}
                stripMediaHeadings={false}
              />
            </section>
          );
        }

        if (type === "heading") {
          return (
            <section key={key} {...flexibleBlockDisplayProps(block, "min-w-0")}>
              <FlexibleHeading block={block} language={language} />
            </section>
          );
        }

        if (type === "divider") {
          return <hr key={key} className="border-0 border-t border-slate-200" />;
        }

        if (type === "hero") {
          const image = block.image || block.src;
          return (
            <section key={key} {...flexibleBlockDisplayProps(block, "cms-flexible-hero relative min-h-64 overflow-hidden rounded-lg bg-[#102f46]")}>
              {image && <img src={image} alt={flexibleText(block.alt, language)} className="cms-flexible-media absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <div className={`relative z-[1] flex min-h-64 max-w-3xl flex-col justify-end p-5 sm:p-7 ${image ? "bg-[linear-gradient(90deg,rgba(8,32,50,0.92)_0%,rgba(8,32,50,0.62)_72%,transparent_100%)] text-white" : "text-white"}`}>
                {block.eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-200">{flexibleText(block.eyebrow, language)}</p>}
                {(block.heading || block.title) && <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{flexibleText(block.heading || block.title, language)}</h2>}
                {(block.text || block.intro) && <p className="mt-3 leading-relaxed text-white/90">{flexibleText(block.text || block.intro, language)}</p>}
              </div>
            </section>
          );
        }

        if (type === "image") {
          const image = block.image || block.src || block.url;
          if (!image) return null;
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <figure className="cms-flexible-figure">
                <img src={image} alt={flexibleText(block.alt, language)} className="cms-flexible-media" loading="lazy" />
                {block.caption && <figcaption>{flexibleText(block.caption, language)}</figcaption>}
              </figure>
            </section>
          );
        }

        if (type === "gallery") {
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <div className={`cms-flexible-gallery grid gap-4 ${flexibleColumns(block.columns, 3)}`}>
                {items.map((item, itemIndex) => {
                  const value = typeof item === "string" ? { url: item } : item;
                  const image = value.image || value.src || value.url;
                  if (!image) return null;
                  return (
                    <figure key={value.id || `${key}-image-${itemIndex}`} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-[#f8fbfd]">
                      <img src={image} alt={flexibleText(value.alt, language)} className="cms-flexible-media w-full object-contain" loading="lazy" />
                      {value.caption && <figcaption className="p-3 text-sm font-semibold leading-relaxed text-slate-700">{flexibleText(value.caption, language)}</figcaption>}
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
              <FlexibleHeading block={block} language={language} />
              <div className={`grid items-stretch gap-4 ${flexibleColumns(block.columns)}`}>
                {items.map((item, itemIndex) => (
                  <article
                    key={item.id || item.key || `${key}-card-${itemIndex}`}
                    className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#fbfdfc] shadow-[0_10px_28px_rgba(18,50,74,0.055)]"
                  >
                    {(item.image || item.src) && (
                      <img
                        src={item.image || item.src}
                        alt={flexibleText(item.alt, language)}
                        className="cms-flexible-media aspect-[16/9] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      {item.title && (
                        <h3 className="text-lg font-extrabold leading-snug text-[#102f46]">
                          {flexibleText(item.title, language)}
                        </h3>
                      )}
                      {(item.text || item.summary || item.description) && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {flexibleText(
                            item.text || item.summary || item.description,
                            language
                          )}
                        </p>
                      )}
                      {(item.url || item.path || item.href) && (
                        <div className="mt-auto pt-4">
                          <FlexibleLink item={item} language={language} />
                        </div>
                      )}
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
              <FlexibleHeading block={block} language={language} />
              <ListTag className={`${ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6 text-sm leading-relaxed text-slate-700 marker:font-bold marker:text-orange-500`}>
                {items.map((item, itemIndex) => {
                  const value = typeof item === "string" ? { text: item } : item;
                  return (
                    <li key={value.id || `${key}-item-${itemIndex}`}>
                      {value.title && (
                        <strong className="text-[#102f46]">
                          {flexibleText(value.title, language)}: {" "}
                        </strong>
                      )}
                      {flexibleText(value.text || value.summary || value.label, language)}
                    </li>
                  );
                })}
              </ListTag>
            </section>
          );
        }

        if (type === "stats") {
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <div className={`grid gap-3 ${flexibleColumns(block.columns, 4)}`}>
                {items.map((item, itemIndex) => (
                  <div
                    key={item.id || `${key}-stat-${itemIndex}`}
                    className="rounded-lg border border-emerald-900/10 bg-emerald-50/60 p-4 text-center"
                  >
                    <strong className="block text-2xl font-extrabold text-[#0f6f42]">
                      {flexibleText(item.value, language)}
                    </strong>
                    <span className="mt-1 block text-sm font-semibold text-slate-700">
                      {flexibleText(item.label || item.title, language)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (type === "table") {
          const headers = flexibleItems(block.headers || block.columns);
          const rows = flexibleItems(block.rows);
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  {headers.length > 0 && (
                    <thead className="bg-[#eef8ff] text-[#102f46]">
                      <tr>
                        {headers.map((header, index) => (
                          <th key={`${key}-head-${index}`} className="border-b border-slate-200 p-3 font-extrabold">
                            {flexibleText(header.label || header, language)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`${key}-row-${rowIndex}`} className="border-b border-slate-100 last:border-0">
                        {flexibleItems(row).map((cell, cellIndex) => (
                          <td key={`${key}-cell-${rowIndex}-${cellIndex}`} className="p-3 align-top text-slate-700">
                            {flexibleText(cell, language)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }

        if (["links", "buttons"].includes(type)) {
          return (
            <section key={key} {...shellProps}>
              <FlexibleHeading block={block} language={language} />
              <div className="flex flex-wrap gap-3">
                {items.map((item, itemIndex) => (
                  <FlexibleLink
                    key={item.id || `${key}-link-${itemIndex}`}
                    item={typeof item === "string" ? { title: item, url: item } : item}
                    language={language}
                  />
                ))}
              </div>
            </section>
          );
        }

        if (["callout", "note"].includes(type)) {
          return (
            <aside key={key} {...flexibleBlockDisplayProps(block, "rounded-lg border-l-4 border-[#0b6fa4] bg-sky-50 p-4 text-sm leading-relaxed text-slate-700")}>
              <FlexibleHeading block={block} language={language} />
              {flexibleText(block.text || block.body, language)}
            </aside>
          );
        }

        return null;
      })}
    </div>
  );
};

const buildDivisionSectionsFromHtml = (page) => {
  if (typeof DOMParser === "undefined") {
    return [
      {
        key: "overview",
        label: "Overview",
        type: "html",
        html: page.html,
      },
    ];
  }

  const tabDocument = new DOMParser().parseFromString(page.html, "text/html");
  const tabSections = getDivisionTabSections(tabDocument);
  const overviewLabel =
    tabSections.find((section) => section.key === "overview")?.label || "Overview";
  const tabCategories = tabSections.filter(
    (section) =>
      !["overview", "scientific-manpower"].includes(section.key)
  );
  const orderedCategories = uniqueCategories(
    [
      ...(tabCategories.length ? tabCategories : []),
      ...divisionCategoryDefinitions,
    ].filter((category) => category.key !== "scientific-manpower")
  );
  const document = new DOMParser().parseFromString(page.html, "text/html");
  const profiles = extractProfileCards(page.html).filter((profile) =>
    looksLikePersonName(getProfileName(profile))
  );

  removeDuplicatePageTitle(document, [page.title, page.baseTitle]);
  const panels = findDivisionContentPanels(document);
  findDivisionTabStrips(document).forEach((strip) => strip.remove());
  markProfileContainers(document);

  const contentGroups = (panels.length ? panels : [findDivisionContentContainer(document)])
    .map((panel) =>
      collectDivisionBlocks(panel).filter(
        (block) =>
          hasProfileMarker(block) ||
          compactText(block.textContent) ||
          block.querySelector("img[src], table, ul, ol")
      )
    )
    .filter((blocks) => blocks.length);
  const overviewBlocks = [];
  const sections = [];
  const buckets = new Map();
  const tabOrderedCategories = tabCategories.length ? tabCategories : orderedCategories;
  let tabCategoryIndex = 0;

  const syncTabCategoryIndex = (category) => {
    const categoryIndex = tabOrderedCategories.findIndex(
      (item, index) => index >= tabCategoryIndex && item.key === category.key
    );

    if (categoryIndex >= tabCategoryIndex) {
      tabCategoryIndex = categoryIndex + 1;
    }
  };

  const getNextTabCategory = () => {
    const category = tabOrderedCategories[tabCategoryIndex] || null;

    if (category) {
      tabCategoryIndex += 1;
    }

    return category;
  };

  contentGroups.forEach((blocks, groupIndex) => {
    const explicitCategories = blocks
      .flatMap(getBlockCategoryMarkers)
      .filter((category) => category.key !== "scientific-manpower");
    const nonProfileBlocks = blocks.filter((block) => !hasProfileMarker(block));
    const isProfilePanel = panels.length > 0 && blocks.some(hasProfileMarker);
    let currentCategory = null;

    if (!nonProfileBlocks.length) {
      return;
    }

    // Some legacy Hindi pages nest copies of every following list inside the
    // scientist panel. Those copies are not part of the profile and must not
    // consume the next tab's positional category.
    if (isProfilePanel && !explicitCategories.length) {
      return;
    }

    if (!explicitCategories.length) {
      if (groupIndex === 0 && tabSections.some((section) => section.key === "overview")) {
        overviewBlocks.push(...nonProfileBlocks);
        return;
      }

      currentCategory = getNextTabCategory();
    }

    blocks.forEach((block) => {
      if (hasProfileMarker(block)) {
        return;
      }

      if (isDivisionCategoryMarker(block)) {
        const category = getCategoryForBlock(block);

        if (!category || category.key === "scientific-manpower") {
          currentCategory = null;
          return;
        }

        currentCategory = category;
        syncTabCategoryIndex(category);

        if (!buckets.has(category.key)) {
          buckets.set(category.key, {
            ...category,
            blocks: [],
          });
        }

        return;
      }

      if (!currentCategory) {
        overviewBlocks.push(block);
        return;
      }

      if (!buckets.has(currentCategory.key)) {
        buckets.set(currentCategory.key, {
          ...currentCategory,
          blocks: [],
        });
      }

      buckets.get(currentCategory.key).blocks.push(block);
    });
  });

  const overviewHtml = blocksToHtml(overviewBlocks);

  if (profiles.length) {
    sections.push({
      key: "scientific-manpower",
      label: "Scientific Manpower",
      type: "profiles",
      profiles,
    });
  }

  if (overviewHtml) {
    sections.push({
      key: "overview",
      label: overviewLabel,
      type: "html",
      html: overviewHtml,
    });
  }

  orderedCategories.forEach((category) => {
    const bucket = buckets.get(category.key);
    const html = bucket ? blocksToHtml(bucket.blocks) : "";

    if (html) {
      sections.push({
        key: category.key,
        label: category.label,
        type: "html",
        html,
      });
    }
  });

  buckets.forEach((bucket) => {
    if (orderedCategories.some((category) => category.key === bucket.key)) {
      return;
    }

    const html = blocksToHtml(bucket.blocks);

    if (html) {
      sections.push({
        key: bucket.key,
        label: bucket.label,
        type: "html",
        html,
      });
    }
  });

  return normalizeDivisionSections(page, sections);
};

const mergeMissingSectionMedia = (localizedHtml, structuralHtml) => {
  if (typeof DOMParser === "undefined" || !structuralHtml) {
    return localizedHtml || "";
  }

  const localizedDocument = new DOMParser().parseFromString(localizedHtml || "", "text/html");
  const structuralDocument = new DOMParser().parseFromString(structuralHtml, "text/html");
  const mediaIdentity = (element) => {
    const sources = [
      element.getAttribute?.("src"),
      ...Array.from(element.querySelectorAll?.("source[src]") || []).map((source) => source.getAttribute("src")),
    ].filter(Boolean);
    return sources.join("|");
  };
  const localizedSources = new Set(
    Array.from(localizedDocument.body.querySelectorAll("img[src], video, audio, iframe[src]"))
      .map(mediaIdentity)
      .filter(Boolean)
  );
  const missing = Array.from(
    structuralDocument.body.querySelectorAll("img[src], video, audio, iframe[src]")
  ).filter((element) => {
    const identity = mediaIdentity(element);
    return identity && !localizedSources.has(identity);
  });

  if (!missing.length) return localizedHtml || "";

  const sharedMedia = localizedDocument.createElement("div");
  sharedMedia.setAttribute("data-rsac-shared-media", "true");
  missing.forEach((element) => {
    sharedMedia.append(element.cloneNode(true));
  });
  localizedDocument.body.append(sharedMedia);
  return localizedDocument.body.innerHTML;
};

const mediaSectionKeys = new Set(["map-photos", "training-hostel-photos"]);

const emptyLocalizedSectionLayout = (structuralHtml) => {
  if (typeof DOMParser === "undefined" || !structuralHtml) return "";

  const document = new DOMParser().parseFromString(structuralHtml, "text/html");
  const textNodes = [];
  const visit = (node) => {
    Array.from(node.childNodes || []).forEach((child) => {
      if (child.nodeType === 3) textNodes.push(child);
      else visit(child);
    });
  };

  visit(document.body);
  textNodes.forEach((node) => {
    node.nodeValue = "";
  });
  document.body.querySelectorAll("[title], [aria-label]").forEach((element) => {
    element.removeAttribute("title");
    element.removeAttribute("aria-label");
  });
  document.body.querySelectorAll("img").forEach((image) => image.setAttribute("alt", ""));

  return document.body.innerHTML;
};

const comparableSectionText = (value) =>
  compactText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{Punctuation}\p{Symbol}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanRepeatedMediaSectionText = (sections) => {
  if (typeof DOMParser === "undefined") return sections;

  const referenceTexts = sections
    .filter((section) => !mediaSectionKeys.has(section.key) && section.type === "html")
    .map((section) => {
      const document = new DOMParser().parseFromString(section.html || "", "text/html");
      return comparableSectionText(document.body.textContent);
    })
    .filter(Boolean);
  const placeholderPattern = /^(?:content\s+(?:will\s+be\s+)?available\s+soon|content\s+coming\s+soon|विषयवस्तु\s+शीघ्र\s+ही\s+उपलब्ध\s+हो\s+जाएगी)$/iu;

  return sections.map((section) => {
    if (!mediaSectionKeys.has(section.key) || section.type !== "html") return section;

    const document = new DOMParser().parseFromString(section.html || "", "text/html");
    const structuralDocument = new DOMParser().parseFromString(
      section.structureHtml || "",
      "text/html"
    );
    const hasMedia = Boolean(
      document.body.querySelector("img[src], video, audio, iframe[src], source[src]")
    );
    if (!hasMedia) return section;
    const structuralHasMedia = Boolean(
      structuralDocument.body.querySelector("img[src], video, audio, iframe[src], source[src]")
    );
    const structuralHasBodyText = Array.from(
      structuralDocument.body.querySelectorAll("p, ul, ol, table, blockquote")
    ).some((element) =>
      !element.querySelector("img[src], video, audio, iframe[src], source[src]") &&
      comparableSectionText(element.textContent).length >= 24
    );
    const structureExpectsMediaOnly = structuralHasMedia && !structuralHasBodyText;

    document.body
      .querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote")
      .forEach((element) => {
        if (element.querySelector("img[src], video, audio, iframe[src], source[src]")) return;
        const text = comparableSectionText(element.textContent);
        const unexpectedBodyText = structureExpectsMediaOnly &&
          element.matches("p, ul, ol, table, blockquote") &&
          Boolean(text);
        const repeatedElsewhere = text.length >= 24 && referenceTexts.some(
          (reference) => reference.includes(text)
        );
        if (unexpectedBodyText || repeatedElsewhere || placeholderPattern.test(text)) element.remove();
      });

    Array.from(document.body.querySelectorAll("div, section, article, p"))
      .reverse()
      .forEach((element) => {
        if (!compactText(element.textContent) && !element.querySelector("img, video, audio, iframe, a[href], table")) {
          element.remove();
        }
      });

    return { ...section, html: document.body.innerHTML.trim() };
  });
};

const normalizeDivisionPlacement = (value) =>
  compactText(value)
    .replace(/&amp;|&/gi, " and ")
    .replace(/\b(?:and|amp|division|department|section|studies)\b/gi, " ")
    .replace(/\bresources?\b/gi, "resource")
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, "")
    .toLowerCase();

const profileDeploymentIdentities = (profile) =>
  [
    profile?.baseDeployment,
    profile?.deployment,
    getProfileField(profile || {}, ["Deployment", "Division", "Posting"])?.value,
  ]
    .map(normalizeDivisionPlacement)
    .filter(Boolean);

const profileBelongsToDivisionPage = (profile, page) => {
  const pageIdentities = [page?.baseTitle, page?.title, page?.slug]
    .map(normalizeDivisionPlacement)
    .filter((identity) => identity.length >= 8);
  const deploymentIdentities = profileDeploymentIdentities(profile);

  return pageIdentities.some((pageIdentity) =>
    deploymentIdentities.some((deploymentIdentity) =>
      pageIdentity.includes(deploymentIdentity) ||
      deploymentIdentity.includes(pageIdentity)
    )
  );
};

const mergeDivisionProfileSections = (
  sections,
  page,
  scientistProfiles
) => {
  const existingIndex = sections.findIndex(
    (section) => section.type === "profiles"
  );
  const profiles = dedupeProfileCards(
    getScientistProfileData(scientistProfiles).filter((profile) =>
      profileBelongsToDivisionPage(profile, page)
    )
  );

  // Division staff is owned by the CMS People collection. Imported HTML may
  // supply layout, but it must never reintroduce stale or language-fallback cards.
  if (!profiles.length) {
    return sections.filter((section) => section.type !== "profiles");
  }

  if (existingIndex >= 0) {
    return sections.map((section, index) =>
      index === existingIndex ? { ...section, profiles } : section
    );
  }

  return [
    {
      key: "scientific-manpower",
      label: "Scientific Manpower",
      type: "profiles",
      profiles,
    },
    ...sections,
  ];
};

const buildDivisionSections = (
  page,
  scientistProfiles
) => {
  const localizedSections = buildDivisionSectionsFromHtml(page);

  if (!page.structureHtml || page.structureHtml === page.html) {
    return cleanRepeatedMediaSectionText(
      mergeDivisionProfileSections(
        localizedSections,
        page,
        scientistProfiles
      )
    );
  }

  const structuralSections = buildDivisionSectionsFromHtml({
    ...page,
    html: page.structureHtml,
  });
  const localizedByKey = new Map(
    localizedSections.map((section) => [section.key, section])
  );
  const usedLocalizedKeys = new Set();
  const researchKeys = new Set(["research-paper-published", "research-papers"]);

  const findLocalizedSection = (section) => {
    const exact = localizedByKey.get(section.key);
    if (exact && !usedLocalizedKeys.has(exact.key)) return exact;

    if (researchKeys.has(section.key)) {
      const research = localizedSections.find(
        (candidate) => researchKeys.has(candidate.key) && !usedLocalizedKeys.has(candidate.key)
      );
      if (research) return research;
    }

    const family = divisionSectionFamily(section.label)
      || divisionSectionFamily(String(section.key || "").replace(/-/g, " "));
    if (!family) return null;

    return localizedSections.find((candidate) => {
      if (usedLocalizedKeys.has(candidate.key)) return false;
      const candidateFamily = divisionSectionFamily(candidate.label)
        || divisionSectionFamily(String(candidate.key || "").replace(/-/g, " "));
      return candidateFamily === family;
    }) || null;
  };

  const mergedSections = structuralSections.map((section) => {
    const localized = findLocalizedSection(section);

    if (!localized) {
      return {
        ...section,
        html: emptyLocalizedSectionLayout(section.html),
        structureHtml: section.html,
        isStructureFallback: true,
      };
    }
    usedLocalizedKeys.add(localized.key);

    return {
      ...section,
      ...localized,
      key: section.key,
      // Media controls, link targets, video sources, posters, and ordering are
      // shared. Apply localized CMS text to this structural skeleton below.
      html: mediaSectionKeys.has(section.key)
        ? emptyLocalizedSectionLayout(section.html)
        : mergeMissingSectionMedia(localized.html, section.html),
      structureHtml: section.html,
      ...(mediaSectionKeys.has(section.key) ? { usesStructureLayout: true } : {}),
    };
  });

  return cleanRepeatedMediaSectionText(
    mergeDivisionProfileSections(
      mergedSections,
      page,
      scientistProfiles
    )
  );
};

const getProfileExperienceDuration = (profile) => {
  const experience = getProfileField(profile, [
    "Experience",
    "Experience in Years",
    "Experience in Years/Projects",
    "Professional Experience",
  ]);
  const match = compactText(experience?.value || "").match(
    /(\d{4}\s*(?:-|to|\u2013|\u2014)\s*(?:\d{4}|till date|present|date))/i
  );

  if (!match) {
    return null;
  }

  return {
    label: "Duration",
    value: match[1].replace(/\s*(?:-|\u2013|\u2014|to)\s*/i, " to "),
  };
};

const OfficialProfileCard = ({
  profile,
  scientistProfiles,
}) => {
  const { cards } = useSiteSettings();
  const { t, language } = useLanguage();
  const mergedProfile = mergeKnownScientistDetails(profile, scientistProfiles);
  const profileName = localizeOfficialText(getProfileName(mergedProfile), language);
  const profileDetails = getProfileDetails(mergedProfile);
  const employeeId = getProfileField(mergedProfile, ["Employee Id", "Emp Id"]);
  const designation = getProfileField(mergedProfile, ["Designation"]);
  const deployment = getProfileField(mergedProfile, [
    "Deployment",
    "Division",
    "Posting",
  ]);
  const duration =
    getProfileField(mergedProfile, ["Duration", "Tenure", "Time Period"]) ||
    getProfileExperienceDuration(mergedProfile);
  const frontDetail = designation || deployment || employeeId || profileDetails[0];
  // Always surface deployment/division as the secondary line when present (and not
  // already the front line); fall back to tenure, then employee ID.
  const secondaryDetail =
    (deployment && deployment !== frontDetail ? deployment : null) ||
    duration ||
    (employeeId && employeeId !== frontDetail ? employeeId : null);
  const visibleProfileDetails =
    duration &&
    !profileDetails.some((detail) =>
      ["duration", "tenure", "timeperiod"].some((label) =>
        normalizeLabel(detail.label).includes(label)
      )
    )
      ? [duration, ...profileDetails]
      : profileDetails;
  const imageUrl = getProfileImage(mergedProfile);
  const circularImage = !isScientistProfileCard(mergedProfile);

  return (
    <article
      className="profile-flip-card rsac-profile-card rsac-cv-card h-full min-h-[328px] min-w-0 max-w-full"
      tabIndex={0}
    >
      <div className="profile-flip-inner h-full min-h-[328px] min-w-0 max-w-full">
        <div className="profile-flip-face profile-flip-front flex h-full min-h-[328px] min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_38px_rgba(18,50,74,0.07)]">
          <div className={`relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#edf7f2_0%,#eef6fb_100%)] ${
            circularImage ? "grid h-40 place-items-center p-4" : "h-40"
          }`}>
            {employeeId && (
              <span className="absolute left-2 top-2 z-10 rounded-md bg-white/92 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0b6fa4] shadow-sm">
                {t("ID")}: {employeeId.value}
              </span>
            )}

            {imageUrl && circularImage ? (
              <div className="rsac-circular-portrait h-32 w-32 border-4 border-white bg-white shadow-[0_12px_32px_rgba(18,50,74,0.14)]">
                <img
                  src={imageUrl}
                  alt={profileName}
                  className="rsac-circular-portrait__image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={profileName}
                className="h-full w-full object-contain object-center p-1.5"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className={circularImage
                ? "rsac-circular-portrait grid h-28 w-28 place-items-center border-4 border-white bg-white shadow-[0_12px_32px_rgba(18,50,74,0.1)]"
                : "grid h-full place-items-center"
              }>
                <UserRound className="h-12 w-12 text-[#0f6f42]" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <h2 className="text-base font-extrabold leading-snug text-[#102f46]">
              {profileName}
            </h2>

            {frontDetail && (
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0b6fa4]">
                {t(frontDetail.label)}
              </p>
            )}

            {frontDetail && (
              <p className="profile-card-clamp-3 mt-1 text-sm leading-snug text-slate-600">
                {localizeOfficialText(frontDetail.value, language)}
              </p>
            )}

            {secondaryDetail && secondaryDetail !== frontDetail && (
              <p className="profile-card-clamp-2 mt-auto pt-3 text-xs font-semibold leading-relaxed text-slate-500">
                {t(secondaryDetail.label)}: {localizeOfficialText(secondaryDetail.value, language)}
              </p>
            )}
          </div>
        </div>

        <div
          onWheel={handleNestedWheel}
          data-lenis-prevent
          className="rsac-card-scroll profile-flip-face profile-flip-back absolute inset-0 overflow-y-auto rounded-lg border border-emerald-900/10 bg-[#082032] p-3.5 text-white shadow-[0_14px_38px_rgba(18,50,74,0.12)]"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-200">
            {cards?.profileDetails || t("Profile Details")}
          </p>

          <h3 className="mt-3 text-base font-extrabold leading-snug text-white">
            {profileName}
          </h3>

          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            {visibleProfileDetails.map((detail) => (
              <div key={`${detail.label}-${detail.value}`}>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                  {t(detail.label)}
                </dt>
                <dd className="mt-1 text-slate-100">{localizeOfficialText(detail.value, language)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
};

const OfficialStaticProfileCard = ({ profile }) => {
  const { t } = useLanguage();
  const profileName = getProfileName(profile);
  const primary = getProfileDetails(profile)[0];
  const imageUrl = getProfileImage(profile);

  return (
    <article className="rsac-profile-card rsac-cv-row flex h-full min-h-[118px] gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(18,50,74,0.055)]">
      <div className="rsac-circular-portrait h-20 w-20 shrink-0 border-4 border-white bg-[linear-gradient(135deg,#edf7f2_0%,#eef6fb_100%)] shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={profileName}
            className="rsac-circular-portrait__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <UserRound className="h-9 w-9 text-[#0f6f42]" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-base font-extrabold leading-snug text-[#102f46]">
          {profileName}
        </h2>

        {primary && (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0b6fa4]">
              {t(primary.label)}
            </p>
            <p className="profile-card-clamp-2 mt-1 text-sm font-semibold leading-snug text-slate-700">
              {primary.value}
            </p>
          </div>
        )}
      </div>
    </article>
  );
};

const OfficialProfileGrid = ({ page, scientistProfiles }) => {
  const profiles = useMemo(
    () => getPageProfiles(page, scientistProfiles),
    [page, scientistProfiles]
  );

  if (!profiles.length) {
    return <OfficialHtmlContent html={page.html} pageTitle={page.title} />;
  }

  return (
    <div className="profile-card-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {profiles.map((profile, index) => (
        <OfficialProfileCard
          key={profileCardKey(page.slug, profile, index)}
          profile={profile}
          scientistProfiles={scientistProfiles}
        />
      ))}
    </div>
  );
};

const OfficialStaticProfileGrid = ({ page, scientistProfiles }) => {
  const profiles = useMemo(
    () => getPageProfiles(page, scientistProfiles),
    [page, scientistProfiles]
  );

  if (!profiles.length) {
    return (
      <OfficialRichContent
        page={page}
        scientistProfiles={scientistProfiles}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile, index) => (
        <OfficialStaticProfileCard
          key={profileCardKey(`${page.slug}-static`, profile, index)}
          profile={profile}
        />
      ))}
    </div>
  );
};

const CanonicalRichSections = ({ page }) => {
  const blocks = mergeSharedAssetStructure(
    page.blocks,
    page.structureAssetBlocks || page.sharedAssetBlocks
  ).filter((block) => {
    if (!block || block.hidden || !Object.hasOwn(block, "contentHtml")) return false;
    const hasBody = Boolean(String(block.contentHtml || "").trim());
    const hasMedia = flexibleItems(block.assets).some((asset) => !asset?.hidden && (asset?.value || asset?.sourceValue));
    return hasBody || hasMedia;
  });

  if (!blocks.length) return null;

  return (
    <div className="space-y-7" data-cms-content-source="section-rich-content">
      {blocks.map((block, index) => {
        const heading = String(block.value || "").trim();
        const html = appendNewPageAssets(
          String(block.contentHtml || ""),
          flexibleItems(block.assets).map((asset) => ({ ...asset, isNew: true }))
        );
        return (
          <section key={block.id || block.key || `section-${index}`} className="min-w-0">
            {heading && <h2 className="mb-4 text-xl font-extrabold leading-snug text-[#102f46]">{heading}</h2>}
            <OfficialHtmlContent html={html} pageTitle={heading || page.title} baseTitle={page.baseTitle} pageSlug={page.slug} stripMediaHeadings={false} />
          </section>
        );
      })}
    </div>
  );
};

const OfficialRichContent = ({ page, scientistProfiles }) => {
  const { t } = useLanguage();
  const profiles = useMemo(
    () =>
      getPageProfiles(page, scientistProfiles).filter((profile) =>
        looksLikePersonName(getProfileName(profile))
      ),
    [page, scientistProfiles]
  );
  const peopleAnchor = `${page.slug}-people`;
  const contentAnchor = `${page.slug}-details`;
  const pageBlocks = flexibleItems(page.blocks);
  const hasImportedHtml = Boolean(String(page.html || "").trim());
  const structuredBlocks = [
    ...flexibleItems(page.sections),
    ...(!hasImportedHtml ? pageBlocks : []),
  ];
  const pageLinks = flexibleItems(page.links);
  const structuralHtml = page.html;
  const pageWithCmsRows = useMemo(() => ({
    ...page,
    html: applyImportedPageBlocks(
      applyImportedPageAssets(
        structuralHtml,
        page.structureAssetBlocks || page.sharedAssetBlocks,
        { applyLabels: false }
      ),
      mergeSharedAssetStructure(page.blocks, page.structureAssetBlocks || page.sharedAssetBlocks)
    ),
  }), [page, structuralHtml]);
  const linkBlock = pageLinks.length
    ? [{ type: "links", heading: t("Related links"), items: pageLinks }]
    : [];

  return (
    <div>
      {profiles.length > 0 && (
        <nav
          aria-label={`${page.title} ${t("quick sections")}`}
          className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2"
        >
          <a
            href={`#${peopleAnchor}`}
            className="inline-flex min-h-9 items-center rounded-md bg-emerald-50 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0f6f42] transition hover:bg-[#0f6f42] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
          >
            {t("People")}
          </a>
          <a
            href={`#${contentAnchor}`}
            className="inline-flex min-h-9 items-center rounded-md px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-emerald-50 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
          >
            {t("Details")}
          </a>
        </nav>
      )}

      {profiles.length > 0 && (
        <section
          id={peopleAnchor}
          className="mb-7 scroll-mt-36 rounded-lg border border-emerald-900/10 bg-[#f8fbfd] p-4"
        >
          <h2 className="mb-4 text-lg font-extrabold text-[#102f46]">
            {t("People")}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile, index) => (
              <OfficialProfileCard
                key={profileCardKey(`${page.slug}-embedded`, profile, index)}
                profile={profile}
                scientistProfiles={scientistProfiles}
              />
            ))}
          </div>
        </section>
      )}

      <div id={contentAnchor} className="scroll-mt-36">
        {page.canonicalSectionContent ? (
          <CanonicalRichSections page={page} />
        ) : structuredBlocks.length ? (
          <FlexibleCmsBlocks
            blocks={[...structuredBlocks, ...linkBlock]}
            page={page}
          />
        ) : (
          <>
            <OfficialHtmlContent
              html={pageWithCmsRows.html}
              pageTitle={page.title}
              baseTitle={page.baseTitle}
              pageSlug={page.slug}
              stripProfiles={profiles.length > 0}
            />
            {linkBlock.length > 0 && (
              <div className="mt-6">
                <FlexibleCmsBlocks blocks={linkBlock} page={page} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const escapeExtraItemHtml = (text) =>
  String(text).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

// Editor-added rows join the section's existing list so they inherit its
// numbering and indentation. CMS editors append newly created rows at the end of
// the editor list, so reverse and prepend them here: newest visible item = 1.
// Only when the section has no list to extend do the extras fall back to their
// own <ul>, which the rich-content renderer still styles consistently.
const appendExtraItemsToSection = (html, items) => {
  const newestFirstItems = [...items].reverse();
  const liMarkup = newestFirstItems
    .map(
      (item) => {
        const value = typeof item === "object" ? String(item?.value || "") : String(item || "");
        const richText = typeof item === "object" ? String(item?.richText || "") : "";
        const content = richText && value
          ? sanitizeInlineRichText(richText, value)
          : escapeExtraItemHtml(value);
        return `<li data-rsac-added-item="true">${content}</li>`;
      }
    )
    .join("");

  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(html || "", "text/html");
    const topLevelLists = Array.from(
      parsed.body.querySelectorAll("ul, ol")
    ).filter((list) => !list.parentElement?.closest("li"));
    const targetList = topLevelLists[0];

    if (targetList) {
      targetList.insertAdjacentHTML("afterbegin", liMarkup);
      return parsed.body.innerHTML;
    }
  }

  return `<ul class="rsac-added-items">${liMarkup}</ul>${html || ""}`;
};

const managedDivisionSectionDefinitions = [
  { key: "overview", label: "Overview", aliases: ["overview"] },
  { key: "ongoing-projects", label: "Ongoing Projects", aliases: ["ongoing-projects"], afterKey: "overview" },
  { key: "completed-projects", label: "Completed Projects", aliases: ["completed-projects"], afterKey: "ongoing-projects" },
  { key: "research-papers", label: "Research Papers", aliases: ["research-papers", "research-paper-published"], afterKey: "completed-projects" },
  { key: "technical-reports", label: "Technical Reports", aliases: ["technical-reports"], afterKey: "research-papers" },
  { key: "publications", label: "Publications", aliases: ["publications"], afterKey: "technical-reports" },
  { key: "training-programmes", label: "Training Programmes", aliases: ["training-programmes"], afterKey: "publications" },
  { key: "training-hostel", label: "Training Hostel", aliases: ["training-hostel"], afterKey: "training-programmes" },
];

const managedItemMarkup = (item) => {
  const lines = [
    item.authors,
    item.publicationName,
    [item.year, item.date].filter(Boolean).join(" | "),
    item.details,
  ].filter(Boolean).map((value) => `<span>${escapeExtraItemHtml(value)}</span>`);
  const links = [
    item.documentUrl && `<a href="${escapeExtraItemHtml(item.documentUrl)}">${escapeExtraItemHtml(localizeOfficialText("View document"))}</a>`,
    item.externalUrl && `<a href="${escapeExtraItemHtml(item.externalUrl)}" target="_blank" rel="noopener noreferrer">${escapeExtraItemHtml(localizeOfficialText("Open webpage"))}</a>`,
  ].filter(Boolean).join(" | ");
  return `<strong>${escapeExtraItemHtml(item.title)}</strong>${lines.length ? `<div>${lines.join("<br>")}</div>` : ""}${links ? `<div>${links}</div>` : ""}`;
};

const appendManagedItemsToSection = (html, items) => {
  if (!items?.length) return html || "";
  const itemBodies = items.map((item) => managedItemMarkup(item));
  const liMarkup = itemBodies.map((body) => `<li data-rsac-added-item="true" data-rsac-managed-item="true">${body}</li>`).join("");
  if (typeof DOMParser === "undefined") return `<ol class="rsac-numbered-list">${liMarkup}</ol>${html || ""}`;

  const parsed = new DOMParser().parseFromString(html || "", "text/html");
  const topLevelList = Array.from(parsed.body.querySelectorAll("ul, ol")).find((list) => !list.parentElement?.closest("li"));
  if (topLevelList) {
    topLevelList.classList.add("rsac-numbered-list");
    topLevelList.insertAdjacentHTML("afterbegin", liMarkup);
    return parsed.body.innerHTML;
  }

  const table = parsed.body.querySelector("table");
  if (table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const headerRow = rows.find((row) => row.querySelector("th")) || rows[0];
    if (headerRow) {
      let serialIndex = Array.from(headerRow.children).findIndex((cell) => isSerialNumberHeader(cell.textContent));
      if (serialIndex < 0) {
        const header = parsed.createElement("th");
        header.textContent = localizeOfficialText("S.No.");
        headerRow.prepend(header);
        rows.filter((row) => row !== headerRow).forEach((row) => row.prepend(parsed.createElement("td")));
        serialIndex = 0;
      }
      const cellCount = headerRow.children.length;
      const detailIndex = serialIndex === 0 ? 1 : 0;
      const rowMarkup = itemBodies.map((body) => `<tr data-rsac-added-item="true" data-rsac-managed-item="true">${Array.from({ length: cellCount }, (_, index) => `<td>${index === detailIndex ? body : ""}</td>`).join("")}</tr>`).join("");
      const firstDataRow = rows.find((row) => row !== headerRow);
      if (firstDataRow) firstDataRow.insertAdjacentHTML("beforebegin", rowMarkup);
      else (table.querySelector("tbody") || table).insertAdjacentHTML("beforeend", rowMarkup);
      return parsed.body.innerHTML;
    }
  }

  return `<ol class="rsac-numbered-list">${liMarkup}</ol>${parsed.body.innerHTML}`;
};

const importedBlockSourceLabel = (block) => {
  const ownLabel = [block?.heading, block?.value, block?.label]
    .map((value) => String(value || "").replace(/^section\s*:\s*/i, "").trim())
    .find((value) => value && value.length <= 80);
  if (ownLabel) return ownLabel;
  const childLabel = (block?.children || []).find((child) => child?.label)?.label || "";
  return childLabel.split(/\s*(?:\u2192|->)\s*/u)[0].trim() || block?.heading || block?.label || "";
};

const safeImportedGroupLabel = (child) => {
  const groupLabel = String(child?.groupLabel || "").trim();
  if (!groupLabel) return "";
  const sourceLabel = String(child?.label || "").split(/\s*(?:\u2192|->)\s*/u)[0].trim();
  const sourceSection = canonicalDivisionSection(sourceLabel);
  const groupSection = canonicalDivisionSection(groupLabel);
  if (
    sourceSection &&
    groupSection &&
    divisionSectionFamily(sourceSection) !== divisionSectionFamily(groupSection)
  ) {
    return "";
  }
  return groupLabel;
};

const setInlineCmsContent = (element, child) => {
  const value = String(child?.value || "").trim();
  const richText = String(child?.richText || "");
  if (richText && value) element.innerHTML = sanitizeInlineRichText(richText, value);
  else element.textContent = value;
};

const replaceInlineCmsTextNode = (node, child) => {
  const value = String(child?.value || "").trim();
  const richText = String(child?.richText || "");
  if (!richText || !value) {
    node.nodeValue = value;
    return;
  }
  const holder = node.ownerDocument.createElement("span");
  holder.innerHTML = sanitizeInlineRichText(richText, value);
  node.replaceWith(...Array.from(holder.childNodes));
};

const applyImportedNumberedItems = (html, children, groupHeadingOverrides = []) => {
  if (typeof DOMParser === "undefined" || !children?.length) return html || "";
  const parsed = new DOMParser().parseFromString(html || "", "text/html");
  const createItemFromChild = (child) => {
    const value = String(child?.value || "").trim();
    if (child?.hidden || !value) return null;
    const item = parsed.createElement("li");
    setInlineCmsContent(item, child);
    item.dataset.cmsChildKey = child.key || "";
    if (child.isNew || String(child.key || "").startsWith("cms-")) {
      item.dataset.rsacAddedItem = "true";
    }
    return item;
  };
  const buildListFromChildren = () => {
    const list = parsed.createElement("ol");
    list.classList.add("rsac-numbered-list");
    children.forEach((child) => {
      const item = createItemFromChild(child);
      if (item) list.appendChild(item);
    });
    return list.outerHTML;
  };
  const importedCount = children.filter((child) => !String(child?.key || "").startsWith("cms-")).length;
  const candidates = Array.from(parsed.body.querySelectorAll("ul, ol"))
    .filter((list) => !list.parentElement?.closest("li"))
    .map((list, listIndex) => ({
      list,
      listIndex,
      items: Array.from(list.children).filter((child) => child.tagName === "LI"),
    }))
    .filter(({ items }) => items.length);
  const sourceItems = candidates.flatMap(({ items, listIndex }) =>
    items.map((item) => ({ item, listIndex }))
  );
  const allowedDifference = Math.max(3, Math.ceil(importedCount * 0.2));
  if (!sourceItems.length) {
    const listHtml = buildListFromChildren();
    if (!compactText(parsed.body.textContent) && !parsed.body.querySelector("img, video, audio, iframe, a[href]")) {
      return listHtml;
    }
    parsed.body.insertAdjacentHTML("afterbegin", listHtml);
    return parsed.body.innerHTML;
  }

  // Legacy imports sometimes exposed every inline text node as a CMS row. In
  // that case rebuilding a list would turn one citation into author/comma/year
  // fragments. Keep the original HTML intact until the normalized CMS rows are
  // available instead of publishing malformed content.
  const hasStableCmsRows = children
    .filter((child) => !(child.isNew || String(child.key || "").startsWith("cms-")))
    .every((child) => child.key || child.sourceKeys?.length);
  if (
    Math.abs(sourceItems.length - importedCount) > allowedDifference &&
    !hasStableCmsRows
  ) {
    return html || "";
  }

  const nextItemsByList = candidates.map(() => []);
  const groupLabelsByList = candidates.map(() => "");
  const newItems = [];
  const claimedSourceIndexes = new Set();
  let sourceIndex = 0;
  const claimSourceItem = (child) => {
    const sourceValue = compactText(child?.sourceValue || "").toLowerCase();
    const exactIndex = sourceValue
      ? sourceItems.findIndex(({ item }, index) =>
          !claimedSourceIndexes.has(index) &&
          compactText(item.textContent).toLowerCase() === sourceValue
        )
      : -1;
    if (exactIndex >= 0) {
      claimedSourceIndexes.add(exactIndex);
      return sourceItems[exactIndex];
    }
    while (claimedSourceIndexes.has(sourceIndex)) sourceIndex += 1;
    const fallback = sourceItems[sourceIndex];
    if (fallback) claimedSourceIndexes.add(sourceIndex);
    sourceIndex += 1;
    return fallback;
  };
  children.forEach((child) => {
    const isNew = child.isNew || String(child.key || "").startsWith("cms-");
    const value = String(child.value || "").trim();
    if (isNew) {
      const item = createItemFromChild(child);
      if (item) newItems.push(item);
      return;
    }

    const source = claimSourceItem(child);
    if (child.hidden || !value) return;
    if (!source) {
      const item = createItemFromChild(child);
      if (item) newItems.push(item);
      return;
    }
    const item = source.item.cloneNode(true);
    if (child.richText || compactText(item.textContent) !== compactText(value)) {
      setInlineCmsContent(item, child);
    }
    item.dataset.cmsChildKey = child.key || "";
    if (!groupLabelsByList[source.listIndex]) {
      groupLabelsByList[source.listIndex] = safeImportedGroupLabel(child);
    }
    nextItemsByList[source.listIndex].push(item);
  });
  nextItemsByList[0].unshift(...newItems);
  candidates.forEach(({ list, listIndex }) => {
    list.classList.add("rsac-numbered-list");
    list.replaceChildren(...nextItemsByList[listIndex]);
    const headingValue = String(groupHeadingOverrides[listIndex] || groupLabelsByList[listIndex] || "").trim();
    if (!headingValue) return;
    const headings = Array.from(parsed.body.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const heading = headings.filter((candidate) => candidate.compareDocumentPosition(list) & 4).at(-1);
    if (heading) heading.textContent = headingValue;
  });
  return parsed.body.innerHTML;
};

const applyImportedContentFields = (html, children, { insertNew = true, appendUnmatched = false } = {}) => {
  if (typeof DOMParser === "undefined" || !children?.length) return html || "";
  const parsed = new DOMParser().parseFromString(html || "", "text/html");
  const belongsToImportedTabStrip = (node) => {
    const span = node.parentElement?.closest("span");
    const parent = span?.parentElement;

    if (!span || !parent || span.parentElement !== parent) return false;

    return Array.from(parent.children).filter(
      (child) => child.tagName === "SPAN"
    ).length >= 2;
  };
  const textNodes = () => {
    const nodes = [];
    const walker = parsed.createTreeWalker(parsed.body, 4);
    let node = walker.nextNode();
    while (node) {
      // Tab labels are structural markers. Duplicate title fields can carry
      // the same text, so matching one against a tab span can erase the whole
      // overview section when that duplicate field is hidden in the CMS.
      if (compactText(node.nodeValue) && !belongsToImportedTabStrip(node)) {
        nodes.push(node);
      }
      node = walker.nextNode();
    }
    return nodes;
  };
  const newChildren = [];

  children.forEach((child) => {
    const value = String(child.value || "").trim();
    const isNew = child.isNew || String(child.key || "").startsWith("cms-");
    if (isNew) {
      if (!child.hidden && value) newChildren.push(child);
      return;
    }

    const nodes = textNodes();
    const valueKey = compactText(value).toLowerCase();
    const sourceValueKey = compactText(child.sourceValue || "").toLowerCase();
    const rawLabel = String(child.label || "");
    const labelParts = rawLabel.split(/\s*(?:\u2192|->)\s*/u);
    const sectionLabel = /^section\s*:/iu.test(rawLabel)
      ? rawLabel.replace(/^section\s*:\s*/iu, "")
      : "";
    const previewLabel = labelParts.length > 1
      ? labelParts.slice(1).join(" ")
      : sectionLabel;
    const previewWasTruncated = /(?:\u2026|\.{3})$/u.test(previewLabel.trim());
    const previewKey = compactText(previewLabel.replace(/(?:\u2026|\.{3})$/u, "")).toLowerCase();
    const exactNode = valueKey ? nodes.find((node) => compactText(node.nodeValue).toLowerCase() === valueKey) : null;
    const sourceNode = sourceValueKey
      ? nodes.find((node) => compactText(node.nodeValue).toLowerCase() === sourceValueKey)
      : null;
    const canUsePreviewMatch = previewKey && (
      !child.hidden || valueKey.length >= 80
    );
    const matchedNode = exactNode || sourceNode || (canUsePreviewMatch
      ? nodes.find((node) => {
          const nodeKey = compactText(node.nodeValue).toLowerCase();
          const hasComparableLength = nodeKey.length <= Math.max(
            previewKey.length + 32,
            Math.ceil(previewKey.length * 1.35)
          );
          if (
            nodeKey.startsWith(previewKey) &&
            (previewWasTruncated || hasComparableLength)
          ) {
            return true;
          }

          // A section title often prefixes its first paragraph (for example,
          // "Library"). Do not let that short title capture the paragraph row.
          return previewKey.startsWith(nodeKey) &&
            nodeKey.length >= Math.ceil(previewKey.length * 0.8);
        })
      : null);
    if (!matchedNode) {
      if (appendUnmatched && !child.hidden && value) newChildren.push({ ...child, isNew: true });
      return;
    }

    if (child.hidden || !value) {
      const removable = matchedNode.parentElement?.closest("li, tr, p, h1, h2, h3, h4, h5, h6, figcaption");
      if (removable && parsed.body.contains(removable)) removable.remove();
      else matchedNode.nodeValue = "";
      return;
    }
    if (child.richText || !exactNode) replaceInlineCmsTextNode(matchedNode, child);
  });

  if (insertNew && newChildren.length) {
    const targetList = Array.from(parsed.body.querySelectorAll("ul, ol")).find((list) => !list.parentElement?.closest("li"));
    [...newChildren].reverse().forEach((child) => {
      const item = parsed.createElement(targetList ? "li" : "p");
      setInlineCmsContent(item, child);
      item.dataset.rsacAddedItem = "true";
      item.dataset.cmsChildKey = child.key || "";
      if (targetList) targetList.prepend(item);
      else parsed.body.prepend(item);
    });
  }
  return parsed.body.innerHTML;
};

const applyImportedBlockHeading = (html, block) => {
  const value = String(block?.value || "").trim();
  if (typeof DOMParser === "undefined" || !html) return html || "";

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const source = compactText(String(block.label || "").replace(/^section\s*:\s*/i, "")).toLowerCase();
  const headings = Array.from(parsed.body.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const target = headings.find((heading) => compactText(heading.textContent).toLowerCase() === source)
    || headings.find((heading) => {
      const text = compactText(heading.textContent).toLowerCase();
      return source && (text.startsWith(source) || source.startsWith(text));
    });
  if (target && !value) target.remove();
  else if (target && compactText(target.textContent) !== compactText(value)) target.textContent = value;
  return parsed.body.innerHTML;
};

const controlsImportedSectionLabel = (block) =>
  block?.controlsSectionLabel !== false ||
  (
    block?.assetOnly === true &&
    canonicalDivisionSection(block.sourceLabel || block.value || block.label) === "Map/Photos"
  );

const assetIdentity = (asset) => [
  String(asset?.key || ""),
  String(asset?.kind || ""),
].join("|");

const assetSourceIdentities = (asset) => new Set([
  String(asset?.sourceValue || "").trim(),
  String(asset?.value || "").trim(),
].filter(Boolean));

const assetsCorrespond = (left, right) => {
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.key && right.key && assetIdentity(left) === assetIdentity(right)) return true;
  const rightSources = assetSourceIdentities(right);
  return [...assetSourceIdentities(left)].some((source) => rightSources.has(source));
};

const findSharedAssetBlock = (localizedBlock, sharedBlocks) => {
  const candidates = flexibleItems(sharedBlocks).filter((block) => block.assets?.length);
  const exact = candidates.find((block) =>
    localizedBlock?.id && block.id && localizedBlock.id === block.id
  );
  if (exact) return exact;

  const sourceLabel = importedBlockSourceLabel(localizedBlock);
  const byLabel = candidates.find((block) =>
    sourceLabel && sectionOverrideKey(importedBlockSourceLabel(block)) === sectionOverrideKey(sourceLabel)
  );
  if (byLabel) return byLabel;

  const localizedAssets = flexibleItems(localizedBlock?.assets);
  const ranked = candidates
    .map((block) => ({
      block,
      score: flexibleItems(block.assets).filter((sharedAsset) =>
        localizedAssets.some((localizedAsset) => assetsCorrespond(sharedAsset, localizedAsset))
      ).length,
    }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score ? ranked[0].block : null;
};

const mergeSharedAssetStructure = (localizedBlocks, sharedBlocks) =>
  flexibleItems(localizedBlocks).map((block) => {
    const sharedBlock = findSharedAssetBlock(block, sharedBlocks);
    if (!sharedBlock) return block;
    const localizedAssets = flexibleItems(block.assets);
    const assets = flexibleItems(sharedBlock.assets).map((sharedAsset) => {
      const localizedAsset = localizedAssets.find((candidate) =>
        assetsCorrespond(sharedAsset, candidate)
      );
      const localizedLabels = {};
      ["alt", "title", "caption", "text"].forEach((field) => {
        localizedLabels[field] = localizedAsset && Object.hasOwn(localizedAsset, field)
          ? localizedAsset[field]
          : "";
      });
      return {
        ...sharedAsset,
        ...localizedLabels,
        // Shared values were already applied to the structural HTML. Matching
        // against that current value avoids section-local key collisions.
        sourceValue: sharedAsset.value || sharedAsset.sourceValue,
      };
    });
    return { ...block, assets };
  });

const applyImportedPageAssets = (html, blocks, options) =>
  applyPageAssetFields(html, flattenPageAssetFields(blocks), options);

const applyImportedPageBlocks = (html, blocks, { insertNewAssets = true } = {}) => {
  const editableBlocks = flexibleItems(blocks).filter((block) =>
    Array.isArray(block.children) || block.key
  );
  const visibleBlocks = editableBlocks.filter((block) => !block.hidden);
  const assetFields = flattenPageAssetFields(visibleBlocks);
  if (!editableBlocks.length && !assetFields.length) return html || "";
  const textFields = flattenImportedPageTextFields(editableBlocks);
  let nextHtml = applyPageTextFields(html || "", textFields);
  nextHtml = applyPageAssetFields(nextHtml, assetFields);
  editableBlocks.forEach((block) => {
    if (controlsImportedSectionLabel(block) && !/^text-\d+$/u.test(String(block.key || ""))) {
      nextHtml = applyImportedBlockHeading(
        nextHtml,
        block.hidden ? { ...block, value: "" } : block
      );
    }
    const unkeyedChildren = flexibleItems(block.children)
      .filter((child) => !child?.key && !child?.isNew)
      .map((child) => block.hidden ? { ...child, hidden: true } : child);
    if (unkeyedChildren.length) {
      nextHtml = applyImportedContentFields(nextHtml, unkeyedChildren, { insertNew: false });
    }
  });
  if (typeof DOMParser === "undefined") return nextHtml;

  const parsed = new DOMParser().parseFromString(nextHtml, "text/html");
  visibleBlocks.forEach((block) => {
    const newChildren = flexibleItems(block.children).filter((child) =>
      (child.isNew || String(child.key || "").startsWith("cms-")) &&
      !child.hidden &&
      String(child.value || "").trim()
    );
    if (!newChildren.length) return;
    const labelKey = compactText(importedBlockSourceLabel(block).replace(/^section\s*:\s*/i, "")).toLowerCase();
    const candidates = Array.from(parsed.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, strong"));
    let anchor = candidates.find((element) => compactText(element.textContent).toLowerCase() === labelKey)
      || candidates.find((element) => compactText(element.textContent).toLowerCase().includes(labelKey));
    newChildren.forEach((child) => {
      const item = parsed.createElement("p");
      setInlineCmsContent(item, child);
      item.dataset.rsacAddedItem = "true";
      item.dataset.cmsChildKey = child.key || "";
      if (anchor) {
        anchor.after(item);
        anchor = item;
      } else {
        parsed.body.prepend(item);
      }
    });
  });
  const rendered = parsed.body.innerHTML;
  return insertNewAssets ? appendNewPageAssets(rendered, assetFields) : rendered;
};

const reorderDivisionSections = (sections, requestedKeys) => {
  const sectionsByKey = new Map(sections.map((section) => [section.key, section]));
  const orderedKeys = [...new Set(requestedKeys)].filter((key) => sectionsByKey.has(key));
  if (orderedKeys.length < 2) return sections;

  const orderedKeySet = new Set(orderedKeys);
  const orderedSections = orderedKeys.map((key) => sectionsByKey.get(key));
  let orderedIndex = 0;

  return sections.map((section) =>
    orderedKeySet.has(section.key) ? orderedSections[orderedIndex++] : section
  );
};

const resolveDivisionSectionOrder = (labels, sections) =>
  flexibleItems(labels)
    .map((label) => {
      const sourceKey = sectionOverrideKey(label);
      const sourceFamily = divisionSectionFamily(label);
      let sectionIndex = sections.findIndex(
        (section) => sectionOverrideKey(section.label) === sourceKey
      );
      if (sectionIndex < 0 && sourceFamily) {
        sectionIndex = sections.findIndex((section) =>
          divisionSectionFamily(section.label) === sourceFamily ||
          divisionSectionFamily(String(section.key || "").replace(/-/g, " ")) === sourceFamily
        );
      }
      if (sectionIndex < 0 && sourceKey.includes("research paper")) {
        sectionIndex = sections.findIndex((section) =>
          ["research-papers", "research-paper-published"].includes(section.key)
        );
      }
      if (sectionIndex < 0 && /division|resources|school of geo/i.test(sourceKey)) {
        sectionIndex = sections.findIndex((section) => section.key === "overview");
      }
      return sections[sectionIndex]?.key || "";
    })
    .filter(Boolean);

const buildCanonicalDivisionSections = (page, scientistProfiles) => {
  const blocks = mergeSharedAssetStructure(
    page.blocks,
    page.structureAssetBlocks || page.sharedAssetBlocks
  );
  const profiles = dedupeProfileCards(
    getScientistProfileData(scientistProfiles).filter((profile) => profileBelongsToDivisionPage(profile, page))
  );
  const usedKeys = new Map();

  return blocks.flatMap((block, index) => {
    if (!block || block.hidden || !Object.hasOwn(block, "contentHtml")) return [];
    const label = String(block.value || "").trim();
    if (!label) return [];

    const identity = `${block.sourceLabel || ""} ${block.label || ""} ${label}`;
    const peopleSection = /scientific manpower|वैज्ञानिक जनशक्ति/iu.test(identity);
    const category = canonicalizeDivisionCategory(block.sourceLabel || block.label || label);
    const baseKey = category?.key || normalizeCategoryText(block.sourceLabel || label)
      .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, "-")
      .replace(/^-|-$/g, "") || `section-${index + 1}`;
    const occurrence = (usedKeys.get(baseKey) || 0) + 1;
    usedKeys.set(baseKey, occurrence);
    const key = occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`;

    if (peopleSection) {
      return profiles.length ? [{ key, label, type: "profiles", profiles }] : [];
    }

    const html = appendNewPageAssets(
      String(block.contentHtml || ""),
      flexibleItems(block.assets).map((asset) => ({ ...asset, isNew: true }))
    );
    if (!String(html || "").trim()) return [];
    return [{ key, label, type: "html", html }];
  });
};

const DivisionCategorizedContent = ({
  page,
  scientistProfiles,
}) => {
  const { t, language } = useLanguage();
  const sections = useMemo(() => {
    if (page.canonicalSectionContent) {
      return buildCanonicalDivisionSections(page, scientistProfiles);
    }
    const preparedPage = {
      ...page,
      html: applyImportedPageAssets(
        page.html,
        page.structureAssetBlocks || page.sharedAssetBlocks,
        { applyLabels: false }
      ),
      structureHtml: applyImportedPageAssets(page.structureHtml, page.structureAssetBlocks),
    };
    const structureTextByKey = new Map(
      extractPageTextFields(preparedPage.structureHtml).map((field) => [field.key, field.value])
    );
    const built = buildDivisionSections(preparedPage, scientistProfiles);
    // Editor tab renames: content_fields section-header rows are synthetic
    // (no html text node), so a renamed header reaches the page as a
    // label -> new-name override instead.
    // Editor-added rows (no key, so no template slot) arrive the same way and
    // are appended to their section as an extra list.
    const overrides = page.sectionLabelOverrides || {};
    const extras = page.sectionExtraItems || {};
    const editablePageBlocks = mergeSharedAssetStructure(
      page.blocks,
      page.structureAssetBlocks || page.sharedAssetBlocks
    );
    const editorSectionOrder = [];
    const headingOverridesBySource = new Map();
    editablePageBlocks
      .filter((block) => block.controlsSectionLabel === false && Array.isArray(block.children))
      .forEach((block) => {
        const key = sectionOverrideKey(block.sourceLabel || block.label || "");
        const values = block.children
          .filter((child) => !child.hidden && String(child.value || "").trim())
          .map((child) => String(child.value).trim());
        if (key && values.length) headingOverridesBySource.set(key, values);
      });
    let nextSections = built.map((section) => {
      const matchKey = sectionOverrideKey(section.label);
      let next = section;
      const added = extras[matchKey];
      if (added?.length && section.type === "html") {
        next = {
          ...next,
          html: appendExtraItemsToSection(next.html || "", added),
        };
      }
      const override = overrides[matchKey];
      return override ? { ...next, label: override } : next;
    });
    const controlledSectionState = new Map();
    editablePageBlocks
      .filter((block) => controlsImportedSectionLabel(block))
      .forEach((block) => {
        const sourceLabel = block.sourceLabel || block.label || importedBlockSourceLabel(block);
        const identity = divisionSectionFamily(sourceLabel) || sectionOverrideKey(sourceLabel);
        if (!identity) return;
        const state = controlledSectionState.get(identity) || { visible: false };
        state.visible ||= !block.hidden && Boolean(String(block.value || "").trim());
        controlledSectionState.set(identity, state);
      });
    nextSections = nextSections.filter((section) => {
      const identity = divisionSectionFamily(section.label)
        || divisionSectionFamily(String(section.key || "").replace(/-/g, " "))
        || sectionOverrideKey(section.label);
      const state = controlledSectionState.get(identity);
      return !state || state.visible;
    });
    const labeledSectionKeys = new Set();
    const routedNewItems = new Map();
    const sectionFamilyIndex = (family) => nextSections.findIndex((section) =>
      divisionSectionFamily(section.label) === family ||
      divisionSectionFamily(String(section.key || "").replace(/-/g, " ")) === family
    );
    editablePageBlocks
      .filter((block) => Array.isArray(block?.children) && !block.hidden)
      .forEach((block) => {
        const sourceLabel = block.sourceLabel || block.label || importedBlockSourceLabel(block);
        const sourceKey = sectionOverrideKey(sourceLabel);
        const sourceFamily = divisionSectionFamily(sourceLabel);
        const routedChildren = new Set();
        block.children.forEach((child) => {
          const isNew = child.isNew || String(child.key || "").startsWith("cms-");
          const targetFamily = divisionSectionFamily(child.sectionKey);
          const value = String(child.value || "").trim();
          if (
            !isNew ||
            child.hidden ||
            !value ||
            !targetFamily ||
            targetFamily === sourceFamily ||
            sectionFamilyIndex(targetFamily) < 0
          ) return;
          const items = routedNewItems.get(targetFamily) || [];
          items.push(child);
          routedNewItems.set(targetFamily, items);
          routedChildren.add(child);
        });
        const selectedChildren = routedChildren.size
          ? block.children.filter((child) => !routedChildren.has(child))
          : block.children;
        const renderChildren = selectedChildren.map((child) => {
          const sourceKeys = [...(child.sourceKeys || []), child.key].filter(Boolean);
          const sourceValue = sourceKeys
            .map((key) => structureTextByKey.get(key))
            .find(Boolean);
          return sourceValue ? { ...child, sourceValue } : child;
        });
        let sectionIndex = nextSections.findIndex((section) => sectionOverrideKey(section.label) === sourceKey);
        if (sectionIndex < 0 && sourceFamily) {
          sectionIndex = sectionFamilyIndex(sourceFamily);
        }
        if (sectionIndex < 0 && sourceKey.includes("research paper")) {
          sectionIndex = nextSections.findIndex((section) => ["research-papers", "research-paper-published"].includes(section.key));
        }
        if (sectionIndex < 0 && /division|resources|school of geo/i.test(sourceKey)) {
          sectionIndex = nextSections.findIndex((section) => section.key === "overview");
        }
        if (sectionIndex < 0) return;
        const sectionKey = nextSections[sectionIndex].key;
        editorSectionOrder.push(sectionKey);
        const visibleLabel = controlsImportedSectionLabel(block)
          ? String(block.value || "").trim()
          : "";
        const existingLabel = String(nextSections[sectionIndex].label || "");
        const combinedPublicationLabelPattern =
          /(?:publications?.*technical\s+reports?|प्रकाशन.*तकनीकी\s+रिपोर्ट)/iu;
        const preserveCombinedPublicationLabel =
          sectionKey === "publications" &&
          combinedPublicationLabelPattern.test(existingLabel) &&
          !combinedPublicationLabelPattern.test(visibleLabel);
        const isFirstVisibleLabel = visibleLabel && !labeledSectionKeys.has(sectionKey);
        const applyVisibleLabel = isFirstVisibleLabel && !preserveCombinedPublicationLabel;
        if (isFirstVisibleLabel) labeledSectionKeys.add(sectionKey);
        if (nextSections[sectionIndex].type !== "html") {
          if (applyVisibleLabel) {
            nextSections = nextSections.map((section, index) =>
              index === sectionIndex ? { ...section, label: visibleLabel } : section
            );
          }
          return;
        }
        nextSections = nextSections.map((section, index) => {
          if (index !== sectionIndex) return section;
          const localizedBlock = { ...block, children: renderChildren };
          const editedHtml = block.editorMode === "numbered_list"
            ? applyImportedNumberedItems(
                section.isStructureFallback || section.usesStructureLayout
                  ? section.html
                  : section.structureHtml || section.html,
                renderChildren,
                headingOverridesBySource.get(sourceKey) || []
              )
            : section.isStructureFallback || section.usesStructureLayout
              ? applyImportedContentFields(
                  section.html || "",
                  renderChildren,
                  { insertNew: true, appendUnmatched: true }
                )
              : applyImportedContentFields(section.html, renderChildren);
          const editedAssets = section.isStructureFallback || section.usesStructureLayout
            ? applyImportedPageAssets(editedHtml, [localizedBlock])
            : editedHtml;
          return {
            ...section,
            ...(applyVisibleLabel ? { label: visibleLabel } : {}),
            html: appendNewPageAssets(editedAssets, block.assets),
          };
        });
      });
    routedNewItems.forEach((items, family) => {
      const targetIndex = sectionFamilyIndex(family);
      if (targetIndex < 0) return;
      nextSections = nextSections.map((section, index) => index === targetIndex
        ? { ...section, html: appendExtraItemsToSection(section.html || "", [...items].reverse()) }
        : section
      );
    });
    const managed = page.managedSectionItems || {};
    managedDivisionSectionDefinitions.forEach((definition) => {
      const items = managed[definition.key];
      if (!items?.length) return;
      const existingIndex = findSectionIndex(nextSections, definition.aliases);
      if (existingIndex >= 0 && nextSections[existingIndex].type === "html") {
        nextSections = nextSections.map((section, index) => index === existingIndex
          ? { ...section, html: appendManagedItemsToSection(section.html, items) }
          : section);
        return;
      }
      nextSections = upsertSection(nextSections, {
        key: definition.key,
        label: definition.label,
        type: "html",
        html: appendManagedItemsToSection("", items),
      }, definition.afterKey);
    });
    const requestedSectionOrder =
      language === "hi" && page.structureSectionOrder?.length
        ? resolveDivisionSectionOrder(page.structureSectionOrder, nextSections)
        : editorSectionOrder;
    return reorderDivisionSections(nextSections, requestedSectionOrder);
  }, [page, language, scientistProfiles]);
  const [activeSectionState, setActiveSectionState] = useState({
    pageSlug: page.slug,
    key: sections[0]?.key || "",
  });
  const activeSectionKey =
    activeSectionState.pageSlug === page.slug &&
    sections.some((section) => section.key === activeSectionState.key)
      ? activeSectionState.key
      : sections[0]?.key || "";
  const activeSection =
    sections.find((section) => section.key === activeSectionKey) || sections[0];

  // The tab splitter keys on the scraped <span> tab-strip markup. When a CMS
  // edit strips those spans (some rich-text editors drop <span> on save),
  // the body collapses so no overview/category panel can be built and only the
  // profile section survives — hiding the entire division write-up. Fall back to
  // the full rich renderer whenever no HTML body section was produced so the
  // complete body always shows. Correctly-structured divisions keep their tabs.
  const hasBodySection = sections.some((section) => section.type === "html");

  if (!sections.length || !hasBodySection) {
    return (
      <OfficialRichContent
        page={page}
        scientistProfiles={scientistProfiles}
      />
    );
  }

  const setActiveSectionKey = (key) => {
    if (key === activeSectionKey) {
      return;
    }

    setActiveSectionState({
      pageSlug: page.slug,
      key,
    });
  };

  const selectSectionByIndex = (index) => {
    const nextSection = sections[index];

    if (!nextSection) {
      return;
    }

    setActiveSectionKey(nextSection.key);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`${page.slug}-${nextSection.key}-tab`)
        ?.focus({ preventScroll: true });
    });
  };

  const handleSectionKeyDown = (event, index) => {
    const lastIndex = sections.length - 1;
    const keyActions = {
      ArrowDown: () => selectSectionByIndex(index === lastIndex ? 0 : index + 1),
      ArrowRight: () => selectSectionByIndex(index === lastIndex ? 0 : index + 1),
      ArrowUp: () => selectSectionByIndex(index === 0 ? lastIndex : index - 1),
      ArrowLeft: () => selectSectionByIndex(index === 0 ? lastIndex : index - 1),
      Home: () => selectSectionByIndex(0),
      End: () => selectSectionByIndex(lastIndex),
    };
    const action = keyActions[event.key];

    if (!action) {
      return;
    }

    event.preventDefault();
    action();
  };

  return (
    <div
      className={
        sections.length > 1
          ? "rsac-detail-layout grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"
          : "rsac-detail-layout min-w-0 space-y-5"
      }
    >
      {sections.length > 1 && (
        <nav
          aria-label={`${page.title} ${t("sections")}`}
          className="rsac-section-tabs h-fit min-w-0 max-w-full rounded-lg border border-slate-200 bg-white p-2 shadow-[0_14px_38px_rgba(18,50,74,0.055)] lg:sticky lg:top-36"
        >
          <div
            className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0"
            role="tablist"
          >
            {sections.map((section, index) => (
              <button
                key={`${page.slug}-nav-${section.key}`}
                id={`${page.slug}-${section.key}-tab`}
                type="button"
                role="tab"
                aria-selected={activeSection.key === section.key}
                aria-controls={`${page.slug}-${section.key}-panel`}
                tabIndex={activeSection.key === section.key ? 0 : -1}
                onClick={() => setActiveSectionKey(section.key)}
                onKeyDown={(event) => handleSectionKeyDown(event, index)}
                className={`flex min-h-10 shrink-0 items-center rounded-md border px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] lg:w-full ${
                  activeSection.key === section.key
                    ? "border-[#0f6f42] bg-[#0f6f42] text-white shadow-[0_10px_24px_rgba(15,111,66,0.18)]"
                    : "border-transparent text-slate-600 hover:border-emerald-900/10 hover:bg-emerald-50 hover:text-[#0f6f42]"
                }`}
              >
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="min-w-0">
          <section
            id={`${page.slug}-${activeSection.key}-panel`}
            role="tabpanel"
            aria-labelledby={`${page.slug}-${activeSection.key}-tab`}
            className="rsac-detail-panel scroll-mt-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_34px_rgba(18,50,74,0.055)]"
          >
            <div className="p-4 sm:p-5 lg:p-6">
              <h2 className="mb-4 text-xl font-extrabold leading-snug text-[#102f46]">
                {activeSection.label}
              </h2>

              {activeSection.type === "profiles" ? (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {activeSection.profiles.map((profile, index) => (
                    <OfficialProfileCard
                      key={profileCardKey(`${page.slug}-${activeSection.key}`, profile, index)}
                      profile={profile}
                      scientistProfiles={scientistProfiles}
                    />
                  ))}
                </div>
              ) : (
                <OfficialHtmlContent
                  html={activeSection.html}
                  pageTitle={activeSection.label}
                  baseTitle={page.baseTitle || page.title}
                  sectionKey={activeSection.key}
                />
              )}
            </div>
          </section>
      </div>
    </div>
  );
};

const Breadcrumbs = ({ section, page }) => {
  const { t } = useLanguage();
  // Hidden site-wide via a single flag; flip SHOW_BREADCRUMBS in
  // src/config/uiConfig.js to restore. The Back button covers up-navigation.
  if (!SHOW_BREADCRUMBS) {
    return null;
  }
  return (
    <nav
      aria-label={t("Breadcrumb")}
      className="mb-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600"
    >
      <Link to="/" className="rounded-md transition hover:text-[#0f6f42]">
        {t("Home")}
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        to={`/${section.route}`}
        className="rounded-md transition hover:text-[#0f6f42]"
      >
        {t(section.title)}
      </Link>
      {page && (
        <>
          <span aria-hidden="true">/</span>
          <span className="text-[#102f46]">{t(page.title)}</span>
        </>
      )}
    </nav>
  );
};

export const OfficialContentIndexPage = ({ sectionKey }) => {
  const officialSections = useRsacOfficialSections();
  const divisions = useDivisions();
  const { t, language } = useLanguage();
  const section = officialSections.find((item) => item.key === sectionKey);

  if (!section) {
    if (!officialSections.length) {
      return <OfficialContentLoading />;
    }

    return <Navigate to="/sitemap" replace />;
  }

  const visiblePages = section.pages.filter(
    (page) => !(section.key === "about-us" && formerPages.includes(page.slug))
  ).sort((left, right) => {
    if (section.key !== "divisions") return 0;
    const normalize = (value) => String(value || "").toLowerCase()
      .replace(/&amp;|&/g, "and")
      .replace(/\bdivisions?\b/g, "")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "");
    const rank = (page) => {
      const title = normalize(page.title);
      const slug = normalize(String(page.slug || "").replace(/amp/g, ""));
      const index = divisions.findIndex((division) =>
        (normalize(division.slug) && slug.startsWith(normalize(division.slug))) ||
        (normalize(division.title) && title === normalize(division.title))
      );
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return rank(left) - rank(right);
  });
  const formerTheme = getOfficialCardTheme(section, {
    title: "Our Formers",
    summary: "Former Chairman Governing Body, Directors, and Scientists.",
  });
  const FormerThemeIcon = formerTheme.icon;

  // Editor collapses the header from "Website Sections" by clearing the Title:
  // no title/intro/breadcrumb, and the kicker grows to carry the page alone.
  const headerCollapsed = !section.title;

  return (
    <PageShell
      eyebrow={section.key === "divisions" ? undefined : section.eyebrow}
      title={section.title}
      intro={section.intro}
      largeEyebrow={headerCollapsed && !!section.eyebrow}
      density="compact"
      actions={<BackButton fallback="/" />}
    >
      {!headerCollapsed && <Breadcrumbs section={section} />}

      <div>
        <section
          className="official-index-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          data-official-section={section.key}
          aria-label={`${section.title} ${t("inner pages")}`}
        >
          {section.key === "about-us" && (
            <Link
              id="our-formers"
              to="/about-us/our-formers"
              style={getOfficialCardStyle(formerTheme)}
              className="official-index-card rsac-effect-card group relative flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#fbfdfc] p-4 text-left no-underline shadow-[0_14px_38px_rgba(18,50,74,0.07)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f6f42]"
              aria-label={t("Open Our Formers")}
            >
              <span className="rsac-shine-layer" aria-hidden="true" />
              <div
                className="official-index-card__visual"
                data-card-theme={getOfficialCardThemeKey(formerTheme)}
                aria-hidden="true"
              >
                <div className="official-index-card__stalk" />
                <span className="official-index-card__watermark">
                  <FormerThemeIcon />
                </span>
                <span className="official-index-card__icon">
                  <FormerThemeIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="official-index-card__leaf-particles">
                  <span className="absolute top-1 right-1 h-1 w-1" style={{ background: formerTheme.accent }} />
                  <span className="absolute top-2 left-1 h-1.5 w-1.5" style={{ background: formerTheme.accent2 }} />
                  <span className="absolute bottom-1 right-2 h-1 w-1" style={{ background: formerTheme.accent }} />
                  <span className="absolute bottom-2 left-2 h-1 w-1" style={{ background: formerTheme.accent2 }} />
                </div>
              </div>

              <h2 className="mt-4 text-xl font-extrabold leading-snug text-[#102f46]">
                {t("Our Formers")}
              </h2>

              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {t("Former Chairman Governing Body, Directors, and Scientists.")}
              </p>

              <span className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white transition group-hover:bg-[#0b5f38]">
                {t("Open")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          )}

          {visiblePages.map((page) => {
            const theme = getOfficialCardTheme(section, page);
            const CardIcon = theme.icon || FileText;

            return (
              <Link
                key={page.slug}
                id={page.slug}
                to={getPagePath(section, page)}
                style={getOfficialCardStyle(theme)}
                className={`official-index-card rsac-effect-card group relative flex h-full touch-manipulation cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#fbfdfc] text-left no-underline shadow-[0_14px_38px_rgba(18,50,74,0.07)] transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f6f42] ${
                  section.key === "facilities"
                      ? "official-index-card--facility official-index-card--warm p-4"
                      : section.key === "divisions"
                        ? "official-index-card--warm p-4"
                        : "p-4"
                }`}
                aria-label={`${t("Open")} ${localizeOfficialText(page.title, language)}`}
              >
                <span className="rsac-shine-layer" aria-hidden="true" />
                <div
                  className="official-index-card__visual"
                  data-card-theme={getOfficialCardThemeKey(theme)}
                  aria-hidden="true"
                >
                  {page.featuredImage && (
                    <img
                      className="official-index-card__image"
                      src={page.featuredImage}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="official-index-card__stalk" />
                  <span className="official-index-card__watermark" aria-hidden="true">
                    <CardIcon />
                  </span>
                  <span className="official-index-card__icon">
                    <CardIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="official-index-card__leaf-particles" aria-hidden="true">
                    <span className="absolute top-1 right-1 h-1 w-1" style={{ background: theme.accent }} />
                    <span className="absolute top-2 left-1 h-1.5 w-1.5" style={{ background: theme.accent2 }} />
                    <span className="absolute bottom-1 right-2 h-1 w-1" style={{ background: theme.accent }} />
                    <span className="absolute bottom-2 left-2 h-1 w-1" style={{ background: theme.accent2 }} />
                  </div>
                </div>

                <div className="official-index-card__body">
                  <h2 className="official-index-card__title mt-4 text-xl font-extrabold leading-snug text-[#102f46]">
                    {localizeOfficialText(page.title, language)}
                  </h2>

                  <p className="official-index-card__summary mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {localizeOfficialText(page.summary || page.preview, language)}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-3 pt-5">
                    <span className="official-index-card__action inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white transition group-hover:bg-[#0b5f38]">
                      {section.key === "facilities" ? t("View facility") : t("Open")}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </PageShell>
  );
};

export const OurFormersPage = () => {
  const cmsScientistProfiles = useScientistProfiles();
  const cmsFormerProfiles = useFormerProfiles();
  const officialSections = useRsacOfficialSections();
  const { pageContent } = useSiteSettings();
  const scientistProfiles = getScientistProfileData(cmsScientistProfiles);
  const section = officialSections.find((item) => item.key === "about-us");
  const formersContent = pageContent.ourFormers;
  const configuredSections = new Map(
    formersContent.sections.map((item) => [item.slug, item])
  );

  if (!section) {
    if (!officialSections.length) {
      return <OfficialContentLoading />;
    }

    return <Navigate to="/sitemap" replace />;
  }

  const sections = dedupeFormerSections(formerSectionDefinitions
    .map((definition) => {
      const page = section.pages.find((item) => item.slug === definition.slug);
      const configuredSection = configuredSections.get(definition.slug);

      if (!page) {
        return null;
      }

      return {
        ...definition,
        ...configuredSection,
        page,
        profiles:
          definition.slug === "our-former"
            ? mergeFormerProfileOverrides(
                getPageProfiles(page, scientistProfiles),
                cmsFormerProfiles
              )
            : getPageProfiles(page, scientistProfiles),
      };
    })
    .filter(Boolean));

  return (
    <PageShell
      className="rsac-people-directory rsac-people-directory--formers"
      eyebrow={formersContent.eyebrow}
      title={formersContent.title}
      intro={formersContent.intro}
      actions={
        <BackButton fallback="/about-us" label={formersContent.backLabel} />
      }
      density="compact"
    >
      <Breadcrumbs section={section} page={{ title: formersContent.title }} />

      <nav
        aria-label={formersContent.navigationLabel}
        className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgba(18,50,74,0.045)] lg:sticky lg:top-32 lg:z-20"
      >
        {sections.map((formerSection) => (
          <a
            key={`former-nav-${formerSection.id}`}
            href={`#${formerSection.id}`}
            onClick={(event) => {
              const target = document.getElementById(formerSection.id);
              if (!target) {
                return;
              }
              event.preventDefault();
              scrollToTarget(target);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-emerald-50 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
          >
            {formerSection.title}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              {formerSection.profiles.length}
            </span>
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        {sections.map((formerSection) => (
          <section
            key={formerSection.id}
            id={formerSection.id}
            className="rsac-former-section scroll-mt-36 p-3 sm:p-5"
          >
            <div className="mb-4 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
                  {formerSection.profiles.length} {formersContent.profilesLabel}
                </p>
                <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-[#102f46] sm:text-2xl">
                  {formerSection.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {formerSection.intro}
                </p>
              </div>
            </div>

            {formerSection.mode === "static" ? (
              <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
                {formerSection.profiles.map((profile, index) => (
                  <OfficialStaticProfileCard
                    key={profileCardKey(formerSection.id, profile, index)}
                    profile={profile}
                  />
                ))}
              </div>
            ) : (
              <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {formerSection.profiles.map((profile, index) => (
                  <OfficialProfileCard
                    key={profileCardKey(formerSection.id, profile, index)}
                    profile={profile}
                    scientistProfiles={scientistProfiles}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
};

export const OfficialContentDetailPage = ({ sectionKey }) => {
  const cmsScientistProfiles = useScientistProfiles();
  const officialSections = useRsacOfficialSections();
  const { t, language } = useLanguage();
  const scientistProfiles = getScientistProfileData(cmsScientistProfiles);
  const { slug } = useParams();
  const section = officialSections.find((item) => item.key === sectionKey);
  const page = section?.pages.find((item) => item.slug === slug);
  if (!section) {
    if (!officialSections.length) {
      return <OfficialContentLoading />;
    }

    return <Navigate to="/sitemap" replace />;
  }

  if (!page) {
    return <Navigate to={`/${section.route}`} replace />;
  }

  const usesCategorizedContent =
    section.key === "divisions" || /^training-division-?$/.test(page.slug);
  const isDivision = section.key === "divisions";
  const sidebarPages =
    section.key === "about-us"
      ? section.pages.filter((item) => !formerPages.includes(item.slug))
      : section.pages;

  return (
    <PageShell
      className={`rsac-official-detail-page${isDivision ? " rsac-division-detail-page" : ""}`}
      eyebrow={isDivision ? undefined : section.eyebrow}
      title={localizeOfficialText(t(page.title), language)}
      intro={isDivision ? undefined : localizeOfficialText(page.summary || page.preview, language)}
      largeEyebrow={false}
      density="compact"
      headingSize={page.headingSize}
      contentSize={page.contentSize}
      contentWidth={page.contentWidth}
      mediaSize={page.mediaSize}
      contentSpacing={page.contentSpacing}
      actions={
        <BackButton
          fallback={`/${section.route}`}
          label={section.title ? `${t("Back")} ${section.title}` : t("Back")}
        />
      }
    >
      {!isDivision && <Breadcrumbs section={section} page={page} />}

      <div
        className={
          usesCategorizedContent
            ? "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6"
            : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
        }
      >
        <article
          className={
            usesCategorizedContent
              ? "rsac-content-frame relative min-w-0"
              : "rsac-content-frame relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_16px_48px_rgba(18,50,74,0.07)] sm:p-5 lg:p-6"
          }
        >
          {!usesCategorizedContent && (
            <div
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
              aria-hidden="true"
            />
          )}

          {usesCategorizedContent ? (
            <DivisionCategorizedContent
              page={page}
              scientistProfiles={scientistProfiles}
            />
          ) : staticProfilePageSlugs.has(page.slug) ? (
            <OfficialStaticProfileGrid
              page={page}
              scientistProfiles={scientistProfiles}
            />
          ) : profilePageSlugs.has(page.slug) ? (
            <OfficialProfileGrid
              page={page}
              scientistProfiles={scientistProfiles}
            />
          ) : (
            <OfficialRichContent
              page={page}
              scientistProfiles={scientistProfiles}
            />
          )}
        </article>

        {!usesCategorizedContent && (
          <aside
            className={`rsac-section-menu h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(18,50,74,0.055)] xl:sticky xl:top-36 ${
              section.key === "facilities" ? "order-first xl:order-none" : ""
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
              {t(section.title)}
            </p>

            <h2 className="mt-3 text-xl font-extrabold text-[#102f46]">
              {t("Section Menu")}
            </h2>

            <div
              className={
                section.key === "facilities"
                  ? "rsac-section-menu__links rsac-section-menu__links--facilities mt-5"
                  : "rsac-section-menu__links mt-5 space-y-2"
              }
            >
              {section.key === "about-us" && (
              <Link
                to="/about-us/our-formers"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#102f46]"
              >
                {t("Our Formers")}
              </Link>
              )}

              {sidebarPages.map((item) => (
                <Link
                  key={item.slug}
                  to={getPagePath(section, item)}
                  aria-current={item.slug === page.slug ? "page" : undefined}
                  className={`rsac-section-menu__link block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    item.slug === page.slug
                      ? "bg-emerald-50 text-[#0f6f42]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#102f46]"
                  }`}
                >
                  {t(item.title)}
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </PageShell>
  );
};
