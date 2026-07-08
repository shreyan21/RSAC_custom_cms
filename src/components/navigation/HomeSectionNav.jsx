import {
  Activity,
  Building2,
  ClipboardCheck,
  Layers3,
  MapPinned,
  Orbit,
  RadioTower,
  Route,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { scrollToTarget } from "../../utils/scroll";

const iconMap = {
  building: Building2,
  activity: Activity,
  clipboard: ClipboardCheck,
  layers: Layers3,
  map: MapPinned,
  orbit: Orbit,
  radio: RadioTower,
  route: Route,
  phone: Smartphone,
};

const defaultHiddenHomeSections = [
  "leadership",
  "quickAccess",
  "geoportals",
  "gallery",
];

const sectionAnchors = {
  mission: "#mission-pulse",
  leadership: "#leadership-updates",
  quickAccess: "#quick-access",
  geoportals: "#geoportals",
  gallery: "#home-gallery",
};

const HomeSectionNav = () => {
  const { homeSections, layout } = useSiteSettings();
  const { t } = useLanguage();
  const hiddenSections = new Set(
    Array.isArray(layout?.hiddenHomeSections)
      ? layout.hiddenHomeSections
      : defaultHiddenHomeSections
  );
  const hiddenAnchors = new Set(
    Object.entries(sectionAnchors)
      .filter(([section]) => hiddenSections.has(section))
      .map(([, anchor]) => anchor)
  );
  const featureTabs = Array.isArray(homeSections.featureTabs)
    ? homeSections.featureTabs
    : [];
  const featureTabItems = featureTabs
    .map((tab, index) => {
      const key = String(tab.key || tab.title || `feature-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return key
        ? {
            label: tab.title || key,
            href: tab.buttonPath || `#home-feature-${key}`,
            icon: tab.icon || "building",
          }
        : null;
    })
    .filter(Boolean);
  const sourceItems = featureTabItems.length
    ? featureTabItems
    : homeSections.navigation || [];
  const navItems = sourceItems.filter(
    ({ href }) => !hiddenAnchors.has(href)
  );

  return (
    <nav
      aria-label={t("Homepage sections")}
      className="sticky top-[6.9rem] z-40 border-y border-slate-200/80 bg-white px-3 py-2 shadow-[0_8px_28px_rgba(18,50,74,0.07)] sm:top-[7.35rem]"
    >
      <div
        data-lenis-prevent
        className="mx-auto flex max-w-4xl items-center justify-start gap-1 overflow-x-auto sm:justify-center"
      >
        {navItems.map(({ label, href, icon }) => {
          const Icon = iconMap[icon] || Orbit;
          const navClass =
            "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition duration-300 hover:bg-emerald-50 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] sm:text-sm";
          const isInternalRoute =
            href && !href.startsWith("#") && !/^https?:\/\//i.test(href);

          if (isInternalRoute) {
            return (
              <Link key={href} to={href} className={navClass}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          }

          return (
            <a
              key={href}
              href={href}
              target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
              rel={/^https?:\/\//i.test(href) ? "noopener noreferrer" : undefined}
              onClick={(event) => {
                const target =
                  href?.startsWith("#") && document.querySelector(href);
                if (!target) {
                  return;
                }
                if (href?.startsWith("#home-feature-")) {
                  return;
                }
                event.preventDefault();
                scrollToTarget(target);
              }}
              className={navClass}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default HomeSectionNav;
