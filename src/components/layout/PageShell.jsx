import Reveal from "../motion/Reveal";
import PageTrail from "../navigation/PageTrail";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";

const headingClasses = {
  compact: "mt-3 text-[1.55rem] md:text-[2rem]",
  normal: "mt-3 text-[1.9rem] md:text-[2.5rem]",
  large: "mt-3 text-[2.25rem] md:text-[3rem]",
};

const normalizeHeading = (value) => String(value || "")
  .toLowerCase()
  .replace(/rsac(?:\s*[-–—]\s*|\s*)up/g, "")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "")
  .trim();

const matchesPath = (settingPath, pathname) => {
  if (!settingPath) return false;
  if (settingPath === pathname) return true;
  return settingPath.endsWith("/*") && pathname.startsWith(settingPath.slice(0, -1));
};

const PageShell = ({
  eyebrow,
  title,
  intro,
  actions,
  breadcrumbs,
  children,
  density = "standard",
  className = "",
  largeEyebrow = false,
}) => {
  const isCompact = density === "compact";
  const { pathname } = useLocation();
  const { pageDisplaySettings = [] } = useSiteSettings();
  const display = pageDisplaySettings.find((item) => item.path === pathname)
    || pageDisplaySettings.find((item) => matchesPath(item.path, pathname));
  const configuredEyebrow = display?.eyebrow?.trim() || eyebrow;
  const configuredTitle = display?.title?.trim() || title;
  const configuredIntro = display?.intro?.trim() || intro;
  const redundantTitle = configuredEyebrow && configuredTitle
    && normalizeHeading(configuredEyebrow) === normalizeHeading(configuredTitle);
  const resolvedEyebrow = display?.hideEyebrow ? undefined : configuredEyebrow;
  const resolvedTitle = display?.hideTitle || redundantTitle ? undefined : configuredTitle;
  const resolvedIntro = display?.hideIntro ? undefined : configuredIntro;
  const effectiveLargeEyebrow = largeEyebrow || (!resolvedTitle && Boolean(resolvedEyebrow));
  const headingSize = display?.headingSize || "normal";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`page-shell-enter page-shell-surface min-h-screen px-5 pb-12 sm:px-8 md:px-12 lg:px-20 ${
        isCompact
          ? "pt-28 sm:pt-32 lg:pt-32"
          : "pt-36 sm:pt-40 lg:pt-40"
      } ${className}`}
    >
      <section className="mx-auto max-w-7xl">
        <PageTrail items={breadcrumbs} />

        <Reveal
          className={`grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end ${
            isCompact ? "gap-5" : "gap-8"
          }`}
        >
          <div>
            {resolvedEyebrow && (
              <p
                className={`rsac-kicker flex items-center text-[#c2410c] ${
                  effectiveLargeEyebrow
                    ? "gap-3 text-[1.2rem] tracking-[0.12em] md:text-[1.45rem]"
                    : "gap-2.5"
                }`}
              >
                <span
                  className="geo-tricolor-bar"
                  style={{ height: effectiveLargeEyebrow ? "1.7rem" : "1.05rem" }}
                  aria-hidden="true"
                />
                {resolvedEyebrow}
              </p>
            )}

            {resolvedTitle && (
              <>
                <h1
                  className={`rsac-display max-w-5xl font-extrabold leading-tight tracking-[-0.022em] text-[#082032] ${
                    isCompact
                      ? headingClasses[headingSize] || headingClasses.normal
                      : headingSize === "compact"
                        ? "mt-4 text-[2rem] md:text-[2.7rem]"
                        : headingSize === "large"
                          ? "mt-4 text-[2.8rem] md:text-[3.8rem]"
                          : "mt-4 text-[2.4rem] md:text-[3.3rem]"
                  }`}
                >
                  {resolvedTitle}
                </h1>

                <span
                  aria-hidden="true"
                  className="mt-4 block h-[3px] w-24 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#fbbf24_30%,#0b6fa4_62%,#15803d_100%)]"
                />
              </>
            )}

            {resolvedIntro && (
              <p
                className={`max-w-3xl text-base font-semibold text-slate-700 ${
                  isCompact
                    ? "mt-3 leading-relaxed"
                    : "mt-5 leading-[1.8] md:text-lg"
                }`}
              >
                {resolvedIntro}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap gap-3 sm:justify-end">
              {actions}
            </div>
          )}
        </Reveal>

        <Reveal className={isCompact ? "mt-6" : "mt-8"} delay={0.08} amount={0.08} pop>
          {children}
        </Reveal>
      </section>
    </main>
  );
};

export default PageShell;
