import { motion, useReducedMotion } from "framer-motion";
import { useSiteSettings } from "../../hooks/useData";
import RsacLocationMap from "../location/RsacLocationMap";
import MaskReveal from "../motion/MaskReveal";

const LocationSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const { location } = useSiteSettings();
  const hasIntro = location.eyebrow || location.title || location.intro;
  const hasMapCard =
    location.cardEyebrow ||
    location.locality ||
    location.address ||
    location.mapQuery ||
    location.directionsLabel;

  if (!hasIntro && !hasMapCard) {
    return null;
  }

  return (
    <section
      id="visit-rsac"
      aria-labelledby="visit-rsac-title"
      className="relative overflow-hidden bg-[#f5faf7] px-5 py-24 sm:px-8 sm:py-28 md:px-12 lg:px-20"
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
          {location.eyebrow && (
            <p className="rsac-kicker flex items-center gap-2.5 text-[#c2410c]">
              <span
                className="geo-tricolor-bar"
                style={{ height: "1.05rem" }}
                aria-hidden="true"
              />
              {location.eyebrow}
            </p>
          )}
          {location.title && (
            <MaskReveal
              as="h2"
              id="visit-rsac-title"
              className="rsac-display mt-5 text-[2rem] font-[800] leading-[1.08] tracking-[-0.02em] text-[#102f46] md:text-[3rem]"
            >
              {location.title}
            </MaskReveal>
          )}
          {location.intro && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {location.intro}
            </p>
          )}
        </motion.div>

        {hasMapCard && <RsacLocationMap />}
      </div>
    </section>
  );
};

export default LocationSection;
