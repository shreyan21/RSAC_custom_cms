import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Accessibility,
  AlignJustify,
  ArrowRight,
  Contrast,
  FileText,
  ImageOff,
  MousePointer2,
  RotateCcw,
  Search,
  Settings2,
  TextCursorInput,
  X,
} from "lucide-react";
import {
  useOfficials,
  useScientistProfiles,
  useTechnicalProfiles,
  useAdministrationProfiles,
  useDivisions,
  useNotices,
  useGeoportals,
  usePolicies,
  useContactDetails,
  useMenuItems,
  useRsacOfficialSections,
  useSiteSettings,
} from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useDialog } from "../../hooks/useDialog";
import { scrollToTarget } from "../../utils/scroll";

// Brand icons (lucide dropped social-brand glyphs) — inline SVG.
const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.9h-2.34V22c4.78-.79 8.43-4.94 8.43-9.94Z" />
  </svg>
);
const TwitterIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.24 2.25h6.83l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" />
  </svg>
);
const socialIcons = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
};

const normalize = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const FONT_SIZE_LEVELS = ["12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px"];
const DEFAULT_FONT_INDEX = 4; // 16px
const formatCurrentTime = (locale = "en-IN") =>
  new Date().toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

const LiveClock = ({ locale }) => {
  const [time, setTime] = useState(() => formatCurrentTime(locale));

  useEffect(() => {
    let interval;
    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
    const timeout = window.setTimeout(() => {
      setTime(formatCurrentTime(locale));
      interval = window.setInterval(
        () => setTime(formatCurrentTime(locale)),
        60_000
      );
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [locale]);

  return time;
};
const getStoredFontSizeIndex = () => {
  if (typeof window === "undefined") return DEFAULT_FONT_INDEX;
  const stored = window.localStorage.getItem("rsac.fontSizeIndex");
  if (stored !== null) return parseInt(stored, 10);
  const oldSize = window.localStorage.getItem("rsac.fontSize");
  if (oldSize) {
    const px = parseInt(oldSize, 10);
    const closestIndex = FONT_SIZE_LEVELS.findIndex((s) => parseInt(s, 10) >= px);
    return closestIndex >= 0 ? closestIndex : DEFAULT_FONT_INDEX;
  }
  return DEFAULT_FONT_INDEX;
};
const getStoredContrast = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem("rsac.highContrast") === "true";
const getStoredPreference = (key) =>
  typeof window !== "undefined" &&
  window.localStorage.getItem(`rsac.${key}`) === "true";
const searchText = (item) =>
  normalize(
    [
      item.title,
      item.description,
      item.type,
      ...(item.keywords || []),
    ].join(" ")
  );

// True when `word` can be typed from `term` with at most one mistake
// (substitution, missing letter, or extra letter). Keeps suggestions working
// through small typos ("divsion" -> "division") without a fuzzy library.
const withinOneEdit = (term, word) => {
  const lengthDiff = word.length - term.length;
  if (lengthDiff < -1 || lengthDiff > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < term.length && j < word.length) {
    if (term[i] === word[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (lengthDiff === 0) {
      i += 1;
      j += 1; // substitution
    } else if (lengthDiff > 0) {
      j += 1; // term is missing a letter
    } else {
      i += 1; // term has an extra letter
    }
  }
  return edits + (term.length - i) + (word.length - j) <= 1;
};

// Score one query term against an item. 0 = no match (term rejected).
// Word-prefix and near-miss matches count, so partial typing and small typos
// still surface the right pages while ranking exact title hits first.
const scoreTerm = (term, title, titleWords, target, targetWords) => {
  if (title === term) return 100;
  if (titleWords.some((word) => word.startsWith(term))) return 60;
  if (title.includes(term)) return 45;
  if (targetWords.some((word) => word.startsWith(term))) return 25;
  if (target.includes(term)) return 18;
  if (term.length >= 4 && titleWords.some((word) => withinOneEdit(term, word)))
    return 12;
  if (term.length >= 5 && targetWords.some((word) => withinOneEdit(term, word)))
    return 6;
  return 0;
};

// Every term must match somewhere (with typo tolerance); the summed score
// ranks the list. Returns 0 when any term finds nothing.
const scoreResult = (item, query) => {
  const title = normalize(item.title);
  const titleWords = title.split(" ").filter(Boolean);
  const target = searchText(item);
  const targetWords = target.split(" ").filter(Boolean);
  const terms = query.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    const termScore = scoreTerm(term, title, titleWords, target, targetWords);
    if (!termScore) return 0;
    score += termScore;
  }
  // Short titles that consumed the whole query rank above long documents
  // that merely contain the words somewhere.
  return score + Math.max(0, 12 - titleWords.length);
};

const DEFAULT_QUICK_SEARCHES = [
  {
    title: "Scientific Manpower",
    description: "Scientist profiles with employee IDs and division details.",
    path: "/about-us/scientific-manpower",
    type: "People",
  },
  {
    title: "Divisions",
    description: "Scientific divisions, projects, reports, maps, and manpower.",
    path: "/divisions",
    type: "Section",
  },
  {
    title: "Facilities",
    description: "Labs, data bank, library, hostel, LiDAR, and service block.",
    path: "/facilities",
    type: "Section",
  },
  {
    title: "Geo-Portals",
    description: "PM Gati Shakti, Bhuvan, NGDR, VEDAS, Samvedan and related services.",
    path: "/geoportals",
    type: "Services",
  },
];

const DEFAULT_INSTITUTIONAL_ITEMS = [
  { title: "Our Formers", description: "Former chairmen, directors, and scientists.", path: "/about-us/our-formers", type: "Institution", keywords: ["former", "formers", "chairman", "director", "scientist", "governing body"] },
  { title: "About RSAC-UP", description: "Established at Lucknow in May 1982.", path: "/about-us/read-more-about-us", type: "Institution", keywords: ["about", "established", "lucknow", "1982", "remote sensing"] },
  { title: "Organisational Chart", description: "Official organisational structure of RSAC-UP.", path: "/organisation-chart", type: "Institution", keywords: ["organisation", "organization", "chart", "structure", "hierarchy"] },
  { title: "Training Programmes", description: "Remote sensing and GIS training programmes.", path: "/academics/training-division-", type: "Training", keywords: ["training", "capacity building", "students", "officials"] },
  { title: "Remote Sensing, GIS, GPS", description: "Core technology areas used by RSAC-UP.", path: "/divisions", type: "Capability", keywords: ["satellite", "remote sensing", "gis", "gps", "image processing"] },
];

const buildSearchIndex = (officials, scientists, technical, admin, divisions, notices, geoportals, policies, contactDetails, menuItems, officialSections, institutionalItems = DEFAULT_INSTITUTIONAL_ITEMS) => {
  const items = [];

  (officials || []).forEach((o) =>
    items.push({ title: o.name, description: o.department || o.role || "", path: "/leadership", type: "Profile", keywords: [o.name, o.role, o.department, o.category] })
  );
  (scientists || []).forEach((s) =>
    items.push({ title: s.name, description: s.designation || "", path: "/scientists", type: "Profile", keywords: [s.name, s.designation, s.specialization, s.deployment, s.department, s.employeeId, s.employee_id, s.email] })
  );
  (technical || []).forEach((t) =>
    items.push({ title: t.name, description: t.designation || "", path: "/technical-staff", type: "Profile", keywords: [t.name, t.designation] })
  );
  (admin || []).forEach((a) =>
    items.push({ title: a.name, description: a.designation || "", path: "/administration", type: "Profile", keywords: [a.name, a.designation] })
  );
  (divisions || []).forEach((d) =>
    items.push({ title: d.title, description: d.lead || "", path: "/divisions/" + d.id, type: "Division", keywords: [d.title, d.lead] })
  );
  (notices || []).forEach((n) =>
    items.push({ title: n.title, description: n.category || "", path: "/notices", type: "Notice", keywords: [n.title, n.category] })
  );
  (menuItems || []).forEach((section) =>
    (section.links || []).forEach((link) => {
      if (!/^https?:\/\//i.test(link.path || "")) {
        items.push({
          title: link.label,
          description: link.description || section.description || "",
          path: link.path,
          type: "Page",
          keywords: [section.title, link.label, link.description || ""],
        });
      }
    })
  );
  (geoportals || []).forEach((g) =>
    items.push({ title: g.title, description: g.description || "", path: "/geoportals", type: "Geoportal", keywords: [g.title] })
  );
  (policies || []).forEach((p) =>
    items.push({ title: p.title, description: p.summary || "", path: "/" + p.slug, type: "Policy", keywords: [p.title, p.summary] })
  );
  if (contactDetails) {
    items.push({ title: "Contact RSAC-UP", description: contactDetails.address || "", path: "/contact", type: "Contact", keywords: [contactDetails.address, contactDetails.email, contactDetails.phone] });
  }
  (officialSections || []).forEach((s) => {
    items.push({ title: s.title, description: s.intro || "", path: "/" + s.route, type: "Section", keywords: [s.title, s.intro] });
    (s.pages || []).forEach((page) => {
      items.push({
        title: page.title,
        description: page.summary || page.preview || "",
        path: s.key === "about-us" && page.slug === "organisational-chart" ? "/organisation-chart" : "/" + s.route + "/" + page.slug,
        type: s.title,
        keywords: [s.title, page.title, page.summary || "", page.preview || ""],
      });
    });
  });

  items.unshift(...institutionalItems);

  return [
    ...new Map(
      items.map((item) => [
        `${normalize(item.title)}|${item.path}|${item.type}`,
        item,
      ])
    ).values(),
  ];
};

const TopBar = () => {
  const { language, setLanguage, isHindi, t } = useLanguage();
  const { requestLanguageChange } = useDialog();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fontSizeIndex, setFontSizeIndex] = useState(getStoredFontSizeIndex);
  const [highContrast, setHighContrast] = useState(getStoredContrast);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [textSpacing, setTextSpacing] = useState(() =>
    getStoredPreference("textSpacing")
  );
  const [lineHeight, setLineHeight] = useState(() =>
    getStoredPreference("lineHeight")
  );
  const [hideImages, setHideImages] = useState(() =>
    getStoredPreference("hideImages")
  );
  const [largeCursor, setLargeCursor] = useState(() =>
    getStoredPreference("largeCursor")
  );
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const officials = useOfficials();
  const scientists = useScientistProfiles();
  const technical = useTechnicalProfiles();
  const admin = useAdministrationProfiles();
  const divisions = useDivisions();
  const notices = useNotices();
  const geoportals = useGeoportals();
  const policies = usePolicies();
  const contactDetails = useContactDetails();
  const menuItems = useMenuItems();
  const officialSections = useRsacOfficialSections();
  const { search: searchCfg, ui, footer } = useSiteSettings();
  const socialLinks = footer?.socialLinks || [];
  const quickSearches = searchCfg?.quickLinks?.length
    ? searchCfg.quickLinks
    : DEFAULT_QUICK_SEARCHES;
  const institutionalItems = searchCfg?.institutionalItems?.length
    ? searchCfg.institutionalItems
    : DEFAULT_INSTITUTIONAL_ITEMS;
  const topbarText = isHindi
    ? {
        skip: "मुख्य सामग्री पर जाएं",
        skipShort: "मुख्य सामग्री",
        screenReader: "स्क्रीन रीडर अभिगम",
        readerShort: "रीडर",
        displayOptions: "प्रदर्शन विकल्प",
        openSearch: "साइट खोज खोलें",
        searchButton: "साइट खोजें",
        decrease: "पाठ आकार घटाएं",
        resetSize: "पाठ आकार सामान्य करें",
        increase: "पाठ आकार बढ़ाएं",
        contrast: "कंट्रास्ट",
        toggleContrast: "उच्च कंट्रास्ट मोड बदलें",
        sitemap: "साइटमैप",
        sitemapShort: "मानचित्र",
        displayTitle: "सुगम्यता प्रदर्शन विकल्प",
        displayIntro: "मूल सामग्री बदले बिना प्रस्तुति समायोजित करें।",
        closeDisplay: "प्रदर्शन विकल्प बंद करें",
        accessibility: "सुगम्यता वक्तव्य",
        resetDisplay: "प्रदर्शन सामान्य करें",
        closeSearch: "खोज बंद करें",
        searchAria: "आरएसएसी वेबसाइट खोज",
      }
    : {
        skip: "Skip to main content",
        skipShort: "Skip to Content",
        screenReader: "Screen Reader Access",
        readerShort: "Reader",
        displayOptions: "Display options",
        openSearch: "Open site search",
        searchButton: "Search site",
        decrease: "Decrease text size",
        resetSize: "Reset text size",
        increase: "Increase text size",
        contrast: "Contrast",
        toggleContrast: "Toggle high contrast mode",
        sitemap: "Sitemap",
        sitemapShort: "Map",
        displayTitle: "Accessibility display options",
        displayIntro: "Adjust presentation without changing the underlying content.",
        closeDisplay: "Close display options",
        accessibility: "Accessibility statement",
        resetDisplay: "Reset display",
        closeSearch: "Close search",
        searchAria: "Search RSAC website",
      };

  const searchIndex = useMemo(
    () => buildSearchIndex(officials, scientists, technical, admin, divisions, notices, geoportals, policies, contactDetails, menuItems, officialSections, institutionalItems),
    [officials, scientists, technical, admin, divisions, notices, geoportals, policies, contactDetails, menuItems, officialSections, institutionalItems]
  );

  const scrollToHash = (hash) => {
    window.setTimeout(() => {
      const target = document.querySelector(hash);

      if (target) {
        scrollToTarget(target);
      }
    }, 80);
  };

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_LEVELS[fontSizeIndex];
    document.documentElement.classList.toggle("rsac-high-contrast", highContrast);
    window.localStorage.setItem("rsac.fontSizeIndex", String(fontSizeIndex));
    window.localStorage.setItem("rsac.highContrast", String(highContrast));
  }, [fontSizeIndex, highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    const preferences = {
      textSpacing,
      lineHeight,
      hideImages,
      largeCursor,
    };

    Object.entries(preferences).forEach(([key, enabled]) => {
      const className = `rsac-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
      root.classList.toggle(className, enabled);
      window.localStorage.setItem(`rsac.${key}`, String(enabled));
    });
  }, [hideImages, largeCursor, lineHeight, textSpacing]);

  useEffect(() => {
    if (!accessibilityOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setAccessibilityOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [accessibilityOpen]);

  useEffect(() => {
    if (!searchOpen) {
      const handleGlobalSearchShortcut = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setSearchOpen(true);
        }
      };

      window.addEventListener("keydown", handleGlobalSearchShortcut);

      return () => {
        window.removeEventListener("keydown", handleGlobalSearchShortcut);
      };
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    document.documentElement.classList.add("rsac-search-open");
    document.body.classList.add("rsac-search-open");
    window.dispatchEvent(
      new CustomEvent("rsac:search-visibility", {
        detail: { open: true },
      })
    );
    window.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      document.documentElement.classList.remove("rsac-search-open");
      document.body.classList.remove("rsac-search-open");
      window.dispatchEvent(
        new CustomEvent("rsac:search-visibility", {
          detail: { open: false },
        })
      );
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  const results = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);

    if (normalizedQuery.length < 2) {
      return [];
    }

    return searchIndex
      .map((item) => ({ item, score: scoreResult(item, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [deferredQuery, searchIndex]);

  const visibleResults = query.trim().length < 2 ? quickSearches : results;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const changeFontSize = (direction) => {
    setFontSizeIndex((prev) => {
      if (direction === "up") return Math.min(prev + 1, FONT_SIZE_LEVELS.length - 1);
      if (direction === "down") return Math.max(prev - 1, 0);
      return DEFAULT_FONT_INDEX;
    });
  };

  const toggleContrast = () => {
    setHighContrast((current) => !current);
  };

  const resetDisplayPreferences = () => {
    setFontSizeIndex(DEFAULT_FONT_INDEX);
    setHighContrast(false);
    setTextSpacing(false);
    setLineHeight(false);
    setHideImages(false);
    setLargeCursor(false);
  };

  const focusMainContent = () => {
    const main = document.getElementById("main-content");

    if (!main) {
      navigate("/");
      scrollToHash("#main-content");
      return;
    }

    main.setAttribute("tabindex", "-1");
    scrollToTarget(main);

    window.setTimeout(() => {
      main.focus({ preventScroll: true });
    }, 120);
  };

  const handleResultClick = (path) => {
    closeSearch();

    if (!path.includes("#")) {
      navigate(path);
      return;
    }

    const [route, hash] = path.split("#");
    const targetRoute = route || "/";
    const targetHash = `#${hash}`;

    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }

    scrollToHash(targetHash);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (visibleResults.length > 0) {
      handleResultClick(visibleResults[0].path);
    }
  };

  return (
    <>
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          focusMainContent();
        }}
        className="fixed left-4 top-11 z-[220] -translate-y-24 rounded-lg bg-[#102f46] px-4 py-2 text-sm font-bold text-white shadow-lg transition focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fb923c]"
      >
        {topbarText.skip}
      </a>

      <div className="rsac-topbar fixed top-0 left-0 z-[130] h-10 w-full border-b border-slate-200/70 bg-[#f0f6fb]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,#ff9933_0%,transparent_25%,transparent_75%,#138808_100%)] opacity-60"
        />
        <div className="rsac-topbar__inner flex h-10 items-center justify-between gap-2 overflow-hidden px-2 text-[11px] text-[#12324a]/72 sm:gap-3 sm:px-6 sm:text-xs md:px-12 lg:px-20">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-5">
            <button
              type="button"
              aria-label={isHindi ? topbarText.skip : ui?.skipToContent || topbarText.skip}
              className="hidden min-h-7 whitespace-nowrap rounded-md px-2 transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 lg:inline"
              onClick={focusMainContent}
            >
              {isHindi ? topbarText.skipShort : ui?.skipToContentShort || topbarText.skipShort}
            </button>

            <Link
              to="/screen-reader-access"
              className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 transition duration-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sm:hidden">{topbarText.readerShort}</span>
              <span className="hidden sm:inline">{topbarText.screenReader}</span>
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                aria-label={topbarText.decrease}
                onClick={() => changeFontSize("down")}
                disabled={fontSizeIndex === 0}
                className="min-h-7 rounded-md px-1.5 font-bold transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit sm:px-2"
              >
                A-
              </button>

              <button
                type="button"
                aria-label={topbarText.resetSize}
                onClick={() => changeFontSize("reset")}
                aria-pressed={fontSizeIndex === DEFAULT_FONT_INDEX}
                className="min-h-7 rounded-md px-1.5 font-bold transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-700 sm:px-2"
              >
                A
              </button>

              <button
                type="button"
                aria-label={topbarText.increase}
                onClick={() => changeFontSize("up")}
                disabled={fontSizeIndex === FONT_SIZE_LEVELS.length - 1}
                className="min-h-7 rounded-md px-1.5 font-bold transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit sm:px-2"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={toggleContrast}
              aria-label={topbarText.toggleContrast}
              aria-pressed={highContrast}
              className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 font-semibold transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 aria-pressed:bg-[#102f46] aria-pressed:text-white"
            >
              <Contrast className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">{topbarText.contrast}</span>
            </button>

            <button
              type="button"
              onClick={() => setAccessibilityOpen((open) => !open)}
              aria-label={isHindi ? topbarText.displayOptions : ui?.displayOptions || topbarText.displayOptions}
              aria-expanded={accessibilityOpen}
              aria-haspopup="dialog"
              className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 transition duration-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden xl:inline">{isHindi ? topbarText.displayOptions : ui?.displayOptions || topbarText.displayOptions}</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 lg:gap-5">
            {socialLinks.length > 0 && (
              <div className="hidden items-center gap-1 md:flex">
                {socialLinks.map((social) => {
                  const SocialIcon = socialIcons[social.icon] || Search;

                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.name} (${t("opens in new tab")})`}
                      title={social.name}
                      className="grid h-7 w-7 place-items-center rounded-md text-[#12324a]/70 transition duration-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                    >
                      <SocialIcon className="h-3.5 w-3.5" />
                    </a>
                  );
                })}
              </div>
            )}

            <div
              role="group"
              aria-label="भाषा चुनें / Select language"
              className="flex items-center rounded-md border border-slate-200 bg-white p-0.5"
            >
              <button
                type="button"
                lang="hi"
                onClick={() => requestLanguageChange("hi")}
                aria-pressed={language === "hi"}
                className="min-h-6 rounded px-1.5 font-bold text-[#0f6f42] transition hover:bg-emerald-50 aria-pressed:bg-emerald-100"
              >
                {searchCfg?.languageLabels?.primary || "हिं"}
              </button>
              <span aria-hidden="true" className="text-slate-300">|</span>
              <button
                type="button"
                lang="en"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className="min-h-6 rounded px-1.5 font-bold text-[#0b6fa4] transition hover:bg-sky-50 aria-pressed:bg-sky-100"
              >
                {searchCfg?.languageLabels?.secondary || "EN"}
              </button>
            </div>

            <div className="hidden whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700 sm:block">
              <LiveClock locale={isHindi ? "hi-IN" : "en-IN"} />
            </div>

            <Link
              to="/sitemap"
              className="inline-flex min-h-7 items-center whitespace-nowrap rounded-md px-2 transition duration-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span className="sm:hidden">{topbarText.sitemapShort}</span>
              <span className="hidden sm:inline">{topbarText.sitemap}</span>
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 font-semibold text-[#102f46] shadow-sm transition duration-300 hover:border-[#0b6fa4]/35 hover:bg-sky-50 hover:text-[#0b6fa4]"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-label={isHindi ? topbarText.openSearch : ui?.openSearch || topbarText.openSearch}
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{isHindi ? topbarText.searchButton : ui?.searchButtonLabel || topbarText.searchButton}</span>
            </button>
          </div>
        </div>
      </div>

      {accessibilityOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="display-options-title"
          className="fixed left-3 right-3 top-12 z-[175] mx-auto max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(18,50,74,0.22)] sm:left-auto sm:right-6 sm:w-[34rem]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#f7fbfe] p-4">
            <div>
              <h2
                id="display-options-title"
                className="text-lg font-extrabold text-[#102f46]"
              >
                {topbarText.displayTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {topbarText.displayIntro}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAccessibilityOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
              aria-label={topbarText.closeDisplay}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {[
              {
                label: isHindi ? "पाठ अंतराल" : "Text spacing",
                description: isHindi
                  ? "अक्षर और शब्द अंतराल बढ़ाएं"
                  : "Increase letter and word spacing",
                icon: TextCursorInput,
                value: textSpacing,
                setValue: setTextSpacing,
              },
              {
                label: isHindi ? "पंक्ति ऊंचाई" : "Line height",
                description: isHindi
                  ? "पंक्तियों के बीच अंतर बढ़ाएं"
                  : "Add breathing room between lines",
                icon: AlignJustify,
                value: lineHeight,
                setValue: setLineHeight,
              },
              {
                label: isHindi ? "चित्र छिपाएं" : "Hide images",
                description: isHindi
                  ? "पाठ और लेआउट रखते हुए चित्र छिपाएं"
                  : "Keep text and layout, hide visual media",
                icon: ImageOff,
                value: hideImages,
                setValue: setHideImages,
              },
              {
                label: isHindi ? "बड़ा कर्सर" : "Large cursor",
                description: isHindi
                  ? "अधिक दिखाई देने वाला बड़ा सूचक उपयोग करें"
                  : "Use a larger high-visibility pointer",
                icon: MousePointer2,
                value: largeCursor,
                setValue: setLargeCursor,
              },
            ].map((option) => {
              const Icon = option.icon;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => option.setValue((enabled) => !enabled)}
                  aria-pressed={option.value}
                  className="flex min-h-20 items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-[#0b6fa4]/30 hover:bg-sky-50 aria-pressed:border-[#0f6f42]/30 aria-pressed:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-[#0b6fa4]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-[#102f46]">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <Link
              to="/accessibility-statement"
              onClick={() => setAccessibilityOpen(false)}
              className="text-sm font-bold text-[#0b6fa4] underline underline-offset-4"
            >
              {topbarText.accessibility}
            </Link>
            <button
              type="button"
              onClick={resetDisplayPreferences}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {topbarText.resetDisplay}
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-search-title"
          data-lenis-prevent
          className="fixed inset-0 z-[180] flex h-[100dvh] items-stretch justify-center overflow-hidden bg-[#041220]/62 p-2 backdrop-blur-md sm:p-4 lg:p-8"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label={topbarText.closeSearch}
            onClick={closeSearch}
          />

          <div className="relative mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_34px_100px_rgba(4,18,32,0.3)] lg:max-h-[52rem]">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
            />

            <form
              onSubmit={handleSearchSubmit}
              role="search"
              aria-label={topbarText.searchAria}
              className="grid shrink-0 gap-3 border-b border-slate-200 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="site-search-title" className="text-lg font-extrabold text-[#102f46] sm:text-xl">
                    {searchCfg?.title || "Search RSAC-UP"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {searchCfg?.subtitle ||
                      "Pages, profiles, divisions, facilities, academics, and portals."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSearch}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-[#12324a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                  aria-label={topbarText.closeSearch}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-[#f8fbfd] px-3 focus-within:border-[#0b6fa4]/45 focus-within:bg-white">
                <Search className="h-5 w-5 shrink-0 text-[#0b6fa4]" aria-hidden="true" />

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={
                    searchCfg?.inputLabel ||
                    "Search divisions, scientists, facilities, academics and geo-portals"
                  }
                  placeholder={
                    searchCfg?.placeholder ||
                    "Type a name, division, facility, PDF topic, or portal"
                  }
                  className="min-h-11 w-full min-w-0 bg-transparent text-base font-semibold text-[#12324a] outline-none placeholder:text-slate-400"
                />
              </div>
            </form>

            <div
              data-lenis-prevent
              className="rsac-contained-scroll min-h-0 flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span aria-live="polite">
                  {query.trim().length < 2
                    ? searchCfg?.quickLinksLabel || "Quick Links"
                    : searchCfg?.resultsLabel || "Search Results"}
                </span>
                <span>
                  {visibleResults.length} {searchCfg?.foundSuffix || "found"}
                </span>
              </div>

              {query.trim().length > 0 && query.trim().length < 2 && (
                <p className="mb-3 rounded-lg border border-sky-900/10 bg-sky-50 px-3 py-2 text-sm font-semibold text-slate-600">
                  {searchCfg?.minCharsHint ||
                    "Type at least 2 characters for site search."}
                </p>
              )}

              {visibleResults.length > 0 ? (
                <div className="space-y-2">
                  {visibleResults.map((item) => (
                    <button
                      key={`${item.type}-${item.title}-${item.path}`}
                      type="button"
                      onClick={() => handleResultClick(item.path)}
                      className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition duration-200 hover:border-[#0b6fa4]/35 hover:bg-[#f7fbfe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] sm:p-4"
                    >
                      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#0f6f42]">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold leading-snug text-[#12324a]">
                            {item.title}
                          </span>
                          <span className="rounded-md bg-[#0b6fa4]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0b6fa4]">
                            {item.type}
                          </span>
                        </span>

                        <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </span>

                        <span className="mt-2 block truncate text-xs font-semibold text-slate-400">
                          {item.path}
                        </span>
                      </span>

                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#0f6f42]" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-base font-bold text-[#12324a]">
                    {searchCfg?.emptyTitle || "No matching result found."}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {searchCfg?.emptyHint ||
                      "Try searching for GIS, agriculture, water, training, disaster, or remote sensing."}
                  </p>
                </div>
              )}

              <Link to="/" className="sr-only" onClick={closeSearch}>
                {t("Return home")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
