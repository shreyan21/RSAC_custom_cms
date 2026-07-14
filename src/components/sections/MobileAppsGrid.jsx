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
  rewriteOfficialMedia,
} from "../../data/officialMedia";

// Used only when CMS Mobile Apps is empty. Both public app listings share it.
const mobileAppsFallback = [
  {
    name: "HRMS App",
    nameHi: "एचआरएमएस ऐप",
    desc: "Human resource management for RSAC-UP staff.",
    descHi: "आरएसएसी-यूपी कर्मियों हेतु मानव संसाधन प्रबंधन।",
    url: "/official-media/legacy-rsac/dam/HRMSFinal.apk",
  },
  {
    name: "Field Survey RSACUP",
    nameHi: "फील्ड सर्वे आरएसएसी-यूपी",
    desc: "Ground-truth and field data collection for survey teams.",
    descHi: "सर्वेक्षण दलों हेतु क्षेत्रीय एवं ग्राउंड-ट्रुथ डेटा संग्रहण।",
    url: "/official-media/legacy-rsac/dam/Field_Survey_RSACUP.apk",
  },
  {
    name: "Corridor Survey",
    nameHi: "कॉरिडोर सर्वे",
    desc: "Linear corridor and utility field survey capture.",
    descHi: "रेखीय कॉरिडोर एवं उपयोगिता क्षेत्रीय सर्वेक्षण।",
    url: "/official-media/legacy-rsac/dam/corridor_field_survey_v2.apk",
  },
  {
    name: "Orchard Mapping",
    nameHi: "बाग मानचित्रण",
    desc: "Field mapping of orchards for horticulture studies.",
    descHi: "उद्यान अध्ययन हेतु बागों का क्षेत्रीय मानचित्रण।",
    url: "/official-media/legacy-rsac/dam/orchard_App_v2.apk",
  },
  {
    name: "Tomato Leaf Disease Detection",
    nameHi: "टमाटर पत्ती रोग पहचान",
    desc: "AI-based detection of tomato leaf diseases.",
    descHi: "एआई आधारित टमाटर पत्ती रोग पहचान।",
    url: "/official-media/legacy-rsac/dam/tomato_app.apk",
  },
];

const mobileAppThemes = [
  {
    matcher: /hrms|human resource/i,
    icon: BriefcaseBusiness,
    image: "/images/mobile-apps/hrms.png",
    accent: "#b54718",
    accent2: "#163f73",
    imagePosition: "center",
  },
  {
    matcher: /field[-\s]?survey|ground-truth/i,
    icon: MapPinned,
    image: "/images/mobile-apps/field-survey.jpg",
    accent: "#176b54",
    accent2: "#b4772c",
    imagePosition: "center 44%",
  },
  {
    matcher: /corridor|utility/i,
    icon: Route,
    image: "/images/mobile-apps/corridor-survey.png",
    accent: "#075985",
    accent2: "#0f766e",
    imagePosition: "center",
  },
  {
    matcher: /orchard|horticulture/i,
    icon: Sprout,
    image: "/images/mobile-apps/orchard-mapping.jpg",
    accent: "#3f7d20",
    accent2: "#b7791f",
    imagePosition: "center 44%",
  },
  {
    matcher: /tomato|disease|leaf/i,
    icon: ScanSearch,
    image: "/images/mobile-apps/tomato-disease.png",
    accent: "#b42318",
    accent2: "#3f7d20",
    imagePosition: "center",
  },
];

const defaultMobileAppTheme = {
  icon: Smartphone,
  image: "",
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
  const { t, isHindi } = useLanguage();
  const c = pageContent.geoportals;

  const apps = cmsMobileApps?.length
    ? cmsMobileApps
    : mobileAppsFallback.map((app) => ({
        key: app.name,
        title: isHindi ? app.nameHi : app.name,
        description: isHindi ? app.descHi : app.desc,
        url: rewriteOfficialMedia(app.url),
        sourceUrl: app.url,
        isLocalFile: false,
      }));

  return (
    <>
      {showHeading && (
        <>
          <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#102f46]">
            <Smartphone className="h-6 w-6 text-[#0f6f42]" aria-hidden="true" />
            {c.mobileAppsHeading || (isHindi ? "मोबाइल ऐप्स" : "Mobile Apps")}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
            {c.mobileAppsIntro ||
              (isHindi
                ? "आरएसएसी-यूपी द्वारा विकसित मोबाइल ऐप डाउनलोड करें।"
                : "Download mobile applications developed by RSAC-UP.")}
          </p>
        </>
      )}

      <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${showHeading ? "mt-6" : ""}`}>
        {apps.map((app) => {
          const downloadUrl = app.url;
          const theme = getMobileAppTheme(app);
          const AppIcon = theme.icon;
          const thumbnail = app.thumbnail || app.image || theme.image;
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
                    {c.downloadLabel || (isHindi ? "डाउनलोड" : "Download")}
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
