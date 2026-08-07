import Reveal from "../motion/Reveal";
import PageTrail from "../navigation/PageTrail";
import CmsRouteBlocks from "../content/CmsRouteBlocks";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";

const headingClasses = {
  tiny: "mt-3 text-[1.25rem] md:text-[1.55rem]",
  compact: "mt-3 text-[1.5rem] md:text-[1.9rem]",
  normal: "mt-3 text-[1.9rem] md:text-[2.5rem]",
  large: "mt-3 text-[2.5rem] md:text-[3.35rem]",
  xlarge: "mt-3 text-[3rem] md:text-[4.1rem]",
};

const introClasses = {
  tiny: "text-xs md:text-sm",
  compact: "text-sm md:text-base",
  normal: "text-base md:text-lg",
  large: "text-lg md:text-xl",
  xlarge: "text-xl md:text-2xl",
};

const soloEyebrowClasses = {
  tiny: "rsac-kicker--small",
  compact: "rsac-kicker--normal",
  normal: "rsac-kicker--large",
  large: "rsac-kicker--page-large",
  xlarge: "rsac-kicker--page-xlarge",
};

const eyebrowSizeClasses = {
  tiny: "rsac-kicker--tiny",
  compact: "rsac-kicker--small",
  normal: "rsac-kicker--normal",
  large: "rsac-kicker--large",
  xlarge: "rsac-kicker--page-large",
};

const eyebrowBarHeights = {
  tiny: "0.8rem",
  compact: "1rem",
  normal: "1.2rem",
  large: "1.5rem",
  xlarge: "1.8rem",
};

const fontStacks = {
  Inter: '"Inter Variable", Inter, "Noto Sans Devanagari Variable", "Noto Sans Devanagari", sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Devanagari Variable", "Noto Sans Devanagari", sans-serif',
  "System Sans": '"Noto Sans Devanagari Variable", "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif',
  "System Serif": 'Georgia, "Noto Serif Devanagari", "Nirmala UI", serif',
};

const clampedPixels = (value, minimum, maximum) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  return `${Math.min(maximum, Math.max(minimum, number))}px`;
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
  eyebrowSize: pageEyebrowSize,
  headingSize: pageHeadingSize = "normal",
  contentSize = "normal",
  pageFont,
  headingFont,
  bodyFontSize,
  headingFontSize,
  eyebrowFontSize,
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
  const eyebrowSize = display?.eyebrowSize || pageEyebrowSize;
  const eyebrowClass = eyebrowSize
    ? eyebrowSizeClasses[eyebrowSize] || eyebrowSizeClasses.normal
    : effectiveLargeEyebrow
      ? soloEyebrowClasses[headingSize] || soloEyebrowClasses.normal
      : "";
  const eyebrowBarHeight = eyebrowSize
    ? eyebrowBarHeights[eyebrowSize] || eyebrowBarHeights.normal
    : effectiveLargeEyebrow
      ? "1.7rem"
      : "1.05rem";
  const EyebrowTag = !resolvedTitle ? "h1" : "p";
  const resolvedContentSize = display?.contentSize || contentSize || "normal";
  const resolvedPageFont = display?.pageFont || pageFont;
  const resolvedHeadingFont = display?.headingFont || headingFont;
  const resolvedBodyFontSize = clampedPixels(display?.bodyFontSize || bodyFontSize, 13, 22);
  const resolvedHeadingFontSize = clampedPixels(display?.headingFontSize || headingFontSize, 24, 72);
  const resolvedEyebrowFontSize = clampedPixels(display?.eyebrowFontSize || eyebrowFontSize, 11, 28);
  const resolvedContentWidth = display?.contentWidth || contentWidth || "normal";
  const resolvedMediaSize = display?.mediaSize || mediaSize || "normal";
  const resolvedContentSpacing = display?.contentSpacing || contentSpacing || "normal";
  const pageStyle = {
    ...(fontStacks[resolvedPageFont] ? { "--rsac-page-font": fontStacks[resolvedPageFont] } : {}),
    ...(fontStacks[resolvedHeadingFont] ? { "--rsac-page-heading-font": fontStacks[resolvedHeadingFont] } : {}),
    ...(resolvedBodyFontSize ? { "--rsac-page-body-size": resolvedBodyFontSize } : {}),
    ...(resolvedHeadingFontSize ? { "--rsac-page-heading-size": resolvedHeadingFontSize } : {}),
    ...(resolvedEyebrowFontSize ? { "--rsac-page-eyebrow-size": resolvedEyebrowFontSize } : {}),
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      style={pageStyle}
      data-rsac-custom-body-size={Boolean(resolvedBodyFontSize)}
      data-rsac-custom-heading-size={Boolean(resolvedHeadingFontSize)}
      data-rsac-custom-eyebrow-size={Boolean(resolvedEyebrowFontSize)}
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
                    ? `gap-3 tracking-normal ${eyebrowClass}`
                    : `gap-2.5 ${eyebrowClass}`
                }`}
              >
                <span
                  className="geo-tricolor-bar"
                  style={{ height: eyebrowBarHeight }}
                  aria-hidden="true"
                />
                {resolvedEyebrow}
              </EyebrowTag>
            )}

            {resolvedTitle && (
              <h1
                className={`rsac-display max-w-5xl pb-[0.1em] font-extrabold leading-tight tracking-normal text-[#082032] ${
                  isCompact
                    ? headingClasses[headingSize] || headingClasses.normal
                    : headingSize === "compact"
                      ? "mt-4 text-[1.9rem] md:text-[2.55rem]"
                      : headingSize === "tiny"
                        ? "mt-4 text-[1.55rem] md:text-[1.95rem]"
                      : headingSize === "large"
                        ? "mt-4 text-[2.8rem] md:text-[3.8rem]"
                        : headingSize === "xlarge"
                          ? "mt-4 text-[3.2rem] md:text-[4.5rem]"
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
