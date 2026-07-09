import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";

import { DataProvider } from "./contexts/DataContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { DialogProvider } from "./contexts/DialogContext";
import Navbar from "./components/navbar/Navbar";

import Hero from "./components/hero/Hero";
import AboutSection from "./components/sections/AboutSection";
import GeoportalSection from "./components/sections/GeoportalSection";
import CommandCenter from "./components/sections/CommandCenter";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/layout/ScrollToTop";
import GlobalLoader from "./components/layout/GlobalLoader";
import ThemeController from "./components/layout/ThemeController";
import SmoothScroll from "./components/layout/SmoothScroll";
import Reveal from "./components/motion/Reveal";
import BackToTopButton from "./components/navigation/BackToTopButton";
import HomeSectionNav from "./components/navigation/HomeSectionNav";
import RouteAnnouncer from "./components/navigation/RouteAnnouncer";
import AnnouncementTicker from "./components/sections/AnnouncementTicker";
import GeoStats from "./components/sections/GeoStats";
import LocationSection from "./components/sections/LocationSection";
import MissionPulse from "./components/sections/MissionPulse";
import ServicesSection from "./components/sections/ServicesSection";
import QuickAccess from "./components/sections/QuickAccess";
import HomeGalleryPreview from "./components/sections/HomeGalleryPreview";
import { useSiteSettings } from "./hooks/useData";
import { useLanguage } from "./hooks/useLanguage";
import { isCmsPreviewMode } from "./data/directusClient";

const OfficialContentIndexPage = lazy(() =>
  import("./pages/OfficialContentPage").then((module) => ({
    default: module.OfficialContentIndexPage,
  }))
);

const OfficialContentDetailPage = lazy(() =>
  import("./pages/OfficialContentPage").then((module) => ({
    default: module.OfficialContentDetailPage,
  }))
);

const OurFormersPage = lazy(() =>
  import("./pages/OfficialContentPage").then((module) => ({
    default: module.OurFormersPage,
  }))
);

const VisionMission = lazy(() => import("./pages/about/VisionMission"));
const VisionSectionPage = lazy(() => import("./pages/about/VisionSectionPage"));
const MobileAppsPage = lazy(() => import("./pages/MobileAppsPage"));
const OrganisationChartPage = lazy(() =>
  import("./pages/about/OrganisationChartPage")
);
const ContactPage = lazy(() => import("./pages/ContactPage"));
const GeoportalsPage = lazy(() => import("./pages/GeoportalsPage"));
const AdministrationPage = lazy(() =>
  import("./pages/people/AdministrationPage")
);
const LeadershipPage = lazy(() => import("./pages/people/LeadershipPage"));
const ManpowerPage = lazy(() => import("./pages/people/ManpowerPage"));
const ScientistsPage = lazy(() => import("./pages/people/ScientistsPage"));
const TechnicalStaffPage = lazy(() =>
  import("./pages/people/TechnicalStaffPage")
);
const PolicyPage = lazy(() => import("./pages/policies/PolicyPage"));
const ScreenReaderAccessPage = lazy(() =>
  import("./pages/policies/ScreenReaderAccessPage")
);
const SitemapPage = lazy(() => import("./pages/policies/SitemapPage"));
const NoticesPage = lazy(() => import("./pages/public/NoticesPage"));
const FloodReportsPage = lazy(() =>
  import("./pages/public/FloodReportsPage")
);
const PublicInfoPage = lazy(() => import("./pages/public/PublicInfoPage"));
const GalleryPage = lazy(() => import("./pages/public/GalleryPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));

const routeFallbackCards = Array.from({ length: 6 }, (_, index) => index);

const RouteFallback = () => {
  const { t } = useLanguage();

  return (
  <main
    id="main-content"
    className="min-h-screen bg-[#f4f9fc] px-5 pb-16 pt-32 sm:px-8 sm:pt-36 md:px-12 lg:px-20"
  >
    <section className="mx-auto max-w-7xl" aria-live="polite" aria-busy="true">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0b6fa4]">
          {t("Loading Official Records")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#102f46]">
          {t("Preparing page content")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t("Please wait while the selected section is loaded.")}
        </p>
      </div>

      <div className="mt-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_48px_rgba(18,50,74,0.07)]">
        <div
          className="h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
          aria-hidden="true"
        />

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-40 animate-pulse rounded bg-sky-100" />
              <div className="mt-3 h-7 w-full max-w-md animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-10 w-36 animate-pulse rounded-lg bg-emerald-50" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {routeFallbackCards.map((item) => (
              <div
                key={`route-fallback-card-${item}`}
                className="flex min-h-28 gap-3 rounded-lg border border-slate-200 bg-[#fbfdfc] p-3"
              >
                <div className="h-20 w-16 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-28 animate-pulse rounded bg-sky-100" />
                  <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  </main>
  );
};

const officialContentRoute = (element) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const CmsPreviewBanner = () =>
  isCmsPreviewMode() ? (
    <div
      className="fixed bottom-4 left-4 z-[240] rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-900 shadow-[0_12px_30px_rgba(18,50,74,0.16)]"
      role="status"
      aria-live="polite"
    >
      CMS Preview
    </div>
  ) : null;

// ======================
// HOMEPAGE
// ======================

const defaultHomeSections = [
  "mission",
  "about",
  "services",
  "stats",
  "location",
];
const defaultHiddenHomeSections = [
  "leadership",
  "quickAccess",
  "geoportals",
  "gallery",
];

const HomePage = () => {
  const { layout } = useSiteSettings();
  const baseOrder =
    Array.isArray(layout?.homeSections) && layout.homeSections.length
      ? layout.homeSections
      : defaultHomeSections;
  // Keep the homepage close to the live RSAC site by hiding repeated panels.
  // Editors can re-enable these from the CMS layout if a future homepage needs them.
  const hiddenSections = new Set(
    Array.isArray(layout?.hiddenHomeSections)
      ? layout.hiddenHomeSections
      : defaultHiddenHomeSections
  );
  // The Objective / Implementation / Sphere of Activities / Mobile Apps items
  // live only in the sticky tab bar (HomeSectionNav); each tab opens its own
  // page. Drop any leftover "featureTabs" entry so the old duplicate card grid
  // never re-appears, even if a stale CMS layout still lists it.
  const sectionOrder = baseOrder.filter(
    (key) => key !== "featureTabs" && !hiddenSections.has(key)
  );
  const sections = {
    mission: <MissionPulse />,
    leadership: (
      <Reveal className="rsac-home-reveal" amount={0.08} pop>
        <CommandCenter />
      </Reveal>
    ),
    about: (
      <Reveal className="rsac-home-reveal" amount={0.1} delay={0.04} pop>
        <AboutSection />
      </Reveal>
    ),
    services: (
      <Reveal className="rsac-home-reveal" amount={0.08} delay={0.02} pop>
        <ServicesSection />
      </Reveal>
    ),
    geoportals: (
      <Reveal className="rsac-home-reveal" amount={0.1} delay={0.04} pop>
        <GeoportalSection />
      </Reveal>
    ),
    quickAccess: (
      <Reveal className="rsac-home-reveal" amount={0.08} pop>
        <QuickAccess />
      </Reveal>
    ),
    stats: (
      <Reveal className="rsac-home-reveal" amount={0.08} pop>
        <GeoStats />
      </Reveal>
    ),
    gallery: (
      <Reveal className="rsac-home-reveal" amount={0.08} pop>
        <HomeGalleryPreview />
      </Reveal>
    ),
    location: (
      <Reveal className="rsac-home-reveal" amount={0.08} pop>
        <LocationSection />
      </Reveal>
    ),
  };

  return (
    <main id="main-content" className="rsac-home-flow">

      <Hero />

      {/* Ticker and section nav are chrome, not content sections, so they are
          gated on the same hiddenHomeSections list: add "announcementTicker" or
          "homeSectionNav" to hide either from the CMS without code changes. */}
      {!hiddenSections.has("announcementTicker") && <AnnouncementTicker />}

      {!hiddenSections.has("homeSectionNav") && <HomeSectionNav />}

      {sectionOrder.map((sectionKey) =>
        sections[sectionKey] ? (
          <div
            key={sectionKey}
            className={sectionKey === "mission" ? undefined : "rsac-deferred-section"}
          >
            {sections[sectionKey]}
          </div>
        ) : null
      )}

    </main>
  );
};

// ======================
// APP
// ======================

function App() {
  return (
    <MotionConfig reducedMotion="user">
    <LanguageProvider>
      <DataProvider>
        <DialogProvider>
        <SmoothScroll />
        <ThemeController />
        <ScrollToTop />
        <GlobalLoader />
        <RouteAnnouncer />

        <Navbar />
        <CmsPreviewBanner />

        <Routes>

        {/* ================= HOME ================= */}

        <Route
          path="/"
          element={<HomePage />}
        />


        {/* ================= ABOUT ================= */}

        <Route
          path="/about-us"
          element={officialContentRoute(
            <OfficialContentIndexPage sectionKey="about-us" />
          )}
        />

        <Route
          path="/about-us/our-formers"
          element={officialContentRoute(<OurFormersPage />)}
        />

        <Route
          path="/about-us/our-chairman's-governing-body"
          element={<Navigate to="/about-us/our-formers#chairman-governing-body" replace />}
        />

        <Route
          path="/about-us/director's"
          element={<Navigate to="/about-us/our-formers#directors" replace />}
        />

        <Route
          path="/about-us/our-former"
          element={<Navigate to="/about-us/our-formers#former-scientists" replace />}
        />

        <Route
          path="/about-us/organisational-chart"
          element={<Navigate to="/organisation-chart" replace />}
        />

        <Route
          path="/about-us/:slug"
          element={officialContentRoute(
            <OfficialContentDetailPage sectionKey="about-us" />
          )}
        />

        <Route
          path="/overview"
          element={<Navigate to="/about-us/read-more-about-us" replace />}
        />

        <Route
          path="/vision"
          element={officialContentRoute(<VisionMission />)}
        />

        {/* Home feature tabs — each opens as its own page. */}
        <Route
          path="/objectives"
          element={officialContentRoute(
            <VisionSectionPage section="objectives" />
          )}
        />

        <Route
          path="/implementation"
          element={officialContentRoute(
            <VisionSectionPage section="implementation" />
          )}
        />

        <Route
          path="/approach"
          element={officialContentRoute(
            <VisionSectionPage section="approach" />
          )}
        />

        <Route
          path="/sphere-of-activities"
          element={officialContentRoute(
            <VisionSectionPage section="sphere" />
          )}
        />

        <Route
          path="/mobile-apps"
          element={officialContentRoute(<MobileAppsPage />)}
        />

        <Route
          path="/leadership"
          element={officialContentRoute(<LeadershipPage />)}
        />

        <Route
          path="/organisation-chart"
          element={officialContentRoute(<OrganisationChartPage />)}
        />

        <Route
          path="/divisions"
          element={officialContentRoute(
            <OfficialContentIndexPage sectionKey="divisions" />
          )}
        />

        <Route
          path="/divisions/:slug"
          element={officialContentRoute(
            <OfficialContentDetailPage sectionKey="divisions" />
          )}
        />

        <Route
          path="/facilities"
          element={officialContentRoute(
            <OfficialContentIndexPage sectionKey="facilities" />
          )}
        />

        <Route
          path="/facilities/:slug"
          element={officialContentRoute(
            <OfficialContentDetailPage sectionKey="facilities" />
          )}
        />

        <Route
          path="/academics"
          element={officialContentRoute(
            <OfficialContentIndexPage sectionKey="academics" />
          )}
        />

        <Route
          path="/academics/:slug"
          element={officialContentRoute(
            <OfficialContentDetailPage sectionKey="academics" />
          )}
        />


        {/* ================= PEOPLE ================= */}

        <Route
          path="/scientists"
          element={officialContentRoute(<ScientistsPage />)}
        />

        <Route
          path="/technical-staff"
          element={officialContentRoute(<TechnicalStaffPage />)}
        />

        <Route
          path="/administration"
          element={officialContentRoute(<AdministrationPage />)}
        />

        <Route
          path="/manpower"
          element={officialContentRoute(<ManpowerPage />)}
        />


        {/* ================= PUBLIC INFO ================= */}

        <Route
          path="/geoportals"
          element={officialContentRoute(<GeoportalsPage />)}
        />

        <Route
          path="/contact"
          element={officialContentRoute(<ContactPage />)}
        />

        <Route
          path="/notices"
          element={officialContentRoute(<NoticesPage />)}
        />

        <Route
          path="/flood-reports"
          element={officialContentRoute(<FloodReportsPage />)}
        />

        <Route
          path="/flood-reports/:year"
          element={officialContentRoute(<FloodReportsPage />)}
        />

        <Route
          path="/rti"
          element={officialContentRoute(<PublicInfoPage slug="rti" />)}
        />

        <Route
          path="/feedback"
          element={officialContentRoute(<PublicInfoPage slug="feedback" />)}
        />

        <Route
          path="/tenders"
          element={officialContentRoute(<PublicInfoPage slug="tenders" />)}
        />

        <Route
          path="/faq"
          element={officialContentRoute(<PublicInfoPage slug="faq" />)}
        />

        <Route
          path="/gallery"
          element={officialContentRoute(<GalleryPage />)}
        />

        <Route
          path="/terms-and-conditions"
          element={officialContentRoute(
            <PolicyPage slug="terms-and-conditions" />
          )}
        />

        <Route
          path="/privacy-policy"
          element={officialContentRoute(<PolicyPage slug="privacy-policy" />)}
        />

        <Route
          path="/copyright-policy"
          element={officialContentRoute(<PolicyPage slug="copyright-policy" />)}
        />

        <Route
          path="/hyperlinking-policy"
          element={officialContentRoute(
            <PolicyPage slug="hyperlinking-policy" />
          )}
        />

        <Route
          path="/disclaimer"
          element={officialContentRoute(<PolicyPage slug="disclaimer" />)}
        />

        <Route
          path="/accessibility-statement"
          element={officialContentRoute(
            <PolicyPage slug="accessibility-statement" />
          )}
        />

        <Route
          path="/help"
          element={officialContentRoute(<PolicyPage slug="help" />)}
        />

        <Route
          path="/screen-reader-access"
          element={officialContentRoute(<ScreenReaderAccessPage />)}
        />

        <Route
          path="/sitemap"
          element={officialContentRoute(<SitemapPage />)}
        />


        {/* ================= FALLBACK ================= */}

        <Route
          path="*"
          element={officialContentRoute(
            <PlaceholderPage />
          )}
        />

        </Routes>

        <Footer />
        <BackToTopButton />
        </DialogProvider>
      </DataProvider>
    </LanguageProvider>
    </MotionConfig>
  );
}

export default App;
