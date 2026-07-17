import Reveal from "../motion/Reveal";
import PageTrail from "../navigation/PageTrail";
import CmsRouteBlocks from "../content/CmsRouteBlocks";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";

const headingClasses = {
  compact: "mt-3 text-[1.5rem] md:text-[1.9rem]",
  normal: "mt-3 text-[1.9rem] md:text-[2.5rem]",
  large: "mt-3 text-[2.5rem] md:text-[3.35rem]",
};

const introClasses = {
  compact: "text-sm md:text-base",
  normal: "text-base md:text-lg",
  large: "text-lg md:text-xl",
};

const soloEyebrowClasses = {
  compact: "rsac-kicker--normal",
  normal: "rsac-kicker--large",
  large: "rsac-kicker--page-large",
};

const contentWidthClasses = {
  compact: "max-w-5xl",
  normal: "max-w-7xl",
  wide: "max-w-[96rem]",
  full: "max-w-none",
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
  headingSize: pageHeadingSize = "normal",
  contentSize = "normal",
  contentWidth = "normal",
  mediaSize = "normal",
  contentSpacing = "normal",
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
  const headingSize = display?.headingSize || pageHeadingSize || "normal";
  const effectiveLargeEyebrow = largeEyebrow || (!resolvedTitle && Boolean(resolvedEyebrow));
  const EyebrowTag = !resolvedTitle ? "h1" : "p";
  const resolvedContentSize = display?.contentSize || contentSize || "normal";
  const resolvedContentWidth = display?.contentWidth || contentWidth || "normal";
  const resolvedMediaSize = display?.mediaSize || mediaSize || "normal";
  const resolvedContentSpacing = display?.contentSpacing || contentSpacing || "normal";

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
      <section className={`mx-auto w-full ${contentWidthClasses[resolvedContentWidth] || contentWidthClasses.normal}`}>
        <PageTrail items={breadcrumbs} />

        <Reveal
          className={`rsac-page-heading grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end ${
            isCompact ? "gap-5" : "gap-8"
          }`}
        >
          <div className="rsac-page-heading__copy">
            {resolvedEyebrow && (
              <EyebrowTag
                className={`rsac-kicker flex items-center text-[#c2410c] ${
                  effectiveLargeEyebrow
                    ? `gap-3 tracking-normal ${soloEyebrowClasses[headingSize] || soloEyebrowClasses.normal}`
                    : "gap-2.5"
                }`}
              >
                <span
                  className="geo-tricolor-bar"
                  style={{ height: effectiveLargeEyebrow ? "1.7rem" : "1.05rem" }}
                  aria-hidden="true"
                />
                {resolvedEyebrow}
              </EyebrowTag>
            )}

            {resolvedTitle && (
              <h1
                className={`rsac-display max-w-5xl font-extrabold leading-tight tracking-normal text-[#082032] ${
                  isCompact
                    ? headingClasses[headingSize] || headingClasses.normal
                    : headingSize === "compact"
                      ? "mt-4 text-[1.9rem] md:text-[2.55rem]"
                      : headingSize === "large"
                        ? "mt-4 text-[2.8rem] md:text-[3.8rem]"
                        : "mt-4 text-[2.35rem] md:text-[3.2rem]"
                }`}
              >
                {resolvedTitle}
              </h1>
            )}

            {resolvedIntro && (
              <p
                className={`max-w-3xl font-semibold text-slate-700 ${
                  introClasses[resolvedContentSize] || introClasses.normal
                } ${
                  isCompact
                    ? "mt-3 leading-relaxed"
                    : "mt-5 leading-[1.8]"
                }`}
              >
                {resolvedIntro}
              </p>
            )}
          </div>

          {actions && (
            <div className="rsac-page-heading__actions flex flex-wrap gap-3 sm:justify-end">
              {actions}
            </div>
          )}
        </Reveal>

        <div className={isCompact ? "mt-6" : "mt-8"}>
          <div
            className="rsac-page-content"
            data-rsac-content-size={resolvedContentSize}
            data-rsac-media-size={resolvedMediaSize}
            data-rsac-content-spacing={resolvedContentSpacing}
          >
            <CmsRouteBlocks blocks={display?.beforeBlocks} className="mb-6" />
            {children}
            <CmsRouteBlocks blocks={display?.afterBlocks} className="mt-6" />
          </div>
        </div>
      </section>
    </main>
  );
};

export default PageShell;
