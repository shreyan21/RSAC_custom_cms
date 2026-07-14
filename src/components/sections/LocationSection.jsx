import { motion, useReducedMotion } from "framer-motion";
import { useSiteSettings } from "../../hooks/useData";
import RsacLocationMap from "../location/RsacLocationMap";
import MaskReveal from "../motion/MaskReveal";

const eyebrowSizeClasses = {
  small: "rsac-kicker--small",
  normal: "rsac-kicker--normal",
  large: "rsac-kicker--large",
};

const LocationSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const { location } = useSiteSettings();
  const eyebrow = String(location.eyebrow || "").trim();
  const title = String(location.title || "").trim();
  const intro = String(location.intro || "").trim();
  const hasIntro = eyebrow || title || intro;
  const hasMapCard =
    location.cardEyebrow ||
    location.locality ||
    location.address ||
    location.mapQuery ||
    location.directionsLabel;

  if (!hasIntro && !hasMapCard) {
    return null;
  }

  const EyebrowTag = title ? "p" : "h2";

  return (
    <section
      id="visit-rsac"
      aria-labelledby={eyebrow || title ? "visit-rsac-title" : undefined}
      className="rsac-home-section relative overflow-hidden bg-[#f5faf7] px-5 py-24 sm:px-8 sm:py-28 md:px-12 lg:px-20"
    >
      <div className="rsac-geo-mesh" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.65 }}
          className="mb-8 max-w-3xl"
        >
          {eyebrow && (
            <EyebrowTag
              id={title ? undefined : "visit-rsac-title"}
              className={`rsac-kicker rsac-home-eyebrow flex items-center gap-2.5 text-[#c2410c] ${
              eyebrowSizeClasses[location.eyebrowSize] || eyebrowSizeClasses.normal
            }`}
            >
              <span
                className="geo-tricolor-bar"
                style={{ height: "1.05rem" }}
                aria-hidden="true"
              />
              {eyebrow}
            </EyebrowTag>
          )}
          {title && (
            <MaskReveal
              as="h2"
              id="visit-rsac-title"
              className="rsac-display mt-5 text-[2rem] font-[800] leading-[1.08] tracking-[-0.02em] text-[#102f46] md:text-[3rem]"
            >
              {title}
            </MaskReveal>
          )}
          {intro && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {intro}
            </p>
          )}
        </motion.div>

        {hasMapCard && <RsacLocationMap />}
      </div>
    </section>
  );
};

export default LocationSection;
