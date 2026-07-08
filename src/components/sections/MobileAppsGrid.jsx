import { Download, Smartphone } from "lucide-react";
import { useMobileApps, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import {
  isUnmirroredLegacyMedia,
  rewriteOfficialMedia,
} from "../../data/officialMedia";

// Fallback used when the CMS "Mobile Apps" collection is empty. Kept here so the
// Geo-Portal page section and the standalone /mobile-apps page render the exact
// same list from one source.
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
    descHi: "सर्वेक्षण दलों हेतु क्षेत्रीय एवं ग्राउंड-ट्रुथ डाटा संग्रहण।",
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

/**
 * Heading + intro + download grid for RSAC-UP mobile apps. Shared by the
 * Geo-Portal page (as an inner section) and the standalone /mobile-apps page.
 */
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
          const isUnavailable =
            !app.isLocalFile &&
            isUnmirroredLegacyMedia(app.sourceUrl || app.url);

          return (
            <article
              key={app.key || app.title}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(18,50,74,0.1)]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-[#0f6f42]/25 bg-[#0f6f42]/10 text-[#0f6f42]">
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-extrabold leading-snug text-[#102f46]">
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
                  className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#0f6f42] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {c.downloadLabel || (isHindi ? "डाउनलोड" : "Download")}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
};

export default MobileAppsGrid;
