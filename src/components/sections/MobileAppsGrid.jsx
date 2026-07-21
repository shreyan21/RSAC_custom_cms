import {
  BriefcaseBusiness,
  Download,
  MapPinned,
  Route,
  ScanSearch,
  Smartphone,
  Sprout,
} from "lucide-react";
import { useMobileApps, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import {
  isUnmirroredLegacyMedia,
} from "../../data/officialMedia";

const mobileAppThemes = [
  {
    matcher: /hrms|human resource/i,
    icon: BriefcaseBusiness,
    accent: "#b54718",
    accent2: "#163f73",
    imagePosition: "center",
  },
  {
    matcher: /field[-\s]?survey|ground-truth/i,
    icon: MapPinned,
    accent: "#176b54",
    accent2: "#b4772c",
    imagePosition: "center 44%",
  },
  {
    matcher: /corridor|utility/i,
    icon: Route,
    accent: "#075985",
    accent2: "#0f766e",
    imagePosition: "center",
  },
  {
    matcher: /orchard|horticulture/i,
    icon: Sprout,
    accent: "#3f7d20",
    accent2: "#b7791f",
    imagePosition: "center 44%",
  },
  {
    matcher: /tomato|disease|leaf/i,
    icon: ScanSearch,
    accent: "#b42318",
    accent2: "#3f7d20",
    imagePosition: "center",
  },
];

const defaultMobileAppTheme = {
  icon: Smartphone,
  accent: "#0f6f42",
  accent2: "#0b6fa4",
  imagePosition: "center",
};

const getMobileAppTheme = (app) => {
  const identity = `${app.key || ""} ${app.title || ""}`;
  const description = app.description || "";
  return mobileAppThemes.find((theme) => theme.matcher.test(identity)) ||
    mobileAppThemes.find((theme) => theme.matcher.test(description)) ||
    defaultMobileAppTheme;
};

const MobileAppsGrid = ({ showHeading = true }) => {
  const cmsMobileApps = useMobileApps();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.contact || {};
  const apps = cmsMobileApps || [];

  return (
    <>
      {showHeading && (
        <>
          <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#102f46]">
            <Smartphone className="h-6 w-6 text-[#0f6f42]" aria-hidden="true" />
            {c.mobileAppsHeading}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
            {c.mobileAppsIntro}
          </p>
        </>
      )}

      <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${showHeading ? "mt-6" : ""}`}>
        {apps.map((app) => {
          const downloadUrl = app.url;
          const theme = getMobileAppTheme(app);
          const AppIcon = theme.icon;
          const thumbnail = app.thumbnail || app.image;
          const isUnavailable =
            !app.isLocalFile &&
            isUnmirroredLegacyMedia(app.sourceUrl || app.url);

          return (
            <article
              key={app.key || app.title}
              className="mobile-app-card group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-white shadow-[0_16px_50px_rgba(18,50,74,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,50,74,0.14)]"
              style={{
                "--mobile-app-accent": app.cardColor || theme.accent,
                "--mobile-app-accent-2": app.cardColor2 || theme.accent2,
              }}
            >
              <div className="mobile-app-card__media">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: app.imagePosition || theme.imagePosition }}
                  />
                ) : (
                  <span className="mobile-app-card__fallback" aria-hidden="true">
                    <AppIcon />
                  </span>
                )}
                <span className="mobile-app-card__overlay" aria-hidden="true" />
                <span className="mobile-app-card__icon" aria-hidden="true">
                  <AppIcon />
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="text-lg font-extrabold leading-snug text-[#102f46]">
                  {app.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {app.description}
                </p>
                {isUnavailable ? (
                  <span
                    className="mt-5 inline-flex min-h-10 w-fit cursor-not-allowed items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
                    aria-disabled="true"
                    title={t("Legacy RSAC media is currently unavailable.")}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {c.unavailableLabel || t("Local copy unavailable")}
                  </span>
                ) : (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-app-card__action mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {c.downloadLabel || t("Download")}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};

export default MobileAppsGrid;
