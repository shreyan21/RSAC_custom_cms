import { motion, useReducedMotion } from "framer-motion";
import { useSiteSettings } from "../../hooks/useData";
import { RevealStagger, RevealItem } from "../motion/RevealStagger";
import MaskReveal from "../motion/MaskReveal";
import CountUp from "../motion/CountUp";

const GeoStats = () => {
  const shouldReduceMotion = useReducedMotion();
  const { impactStats, impactStatsSection = {} } = useSiteSettings();
  const stats = impactStats || [];
  const hasIntro =
    impactStatsSection.eyebrow ||
    impactStatsSection.title ||
    impactStatsSection.description;

  if (!hasIntro && !stats.length) {
    return null;
  }

  return (
    <section
      aria-labelledby={impactStatsSection.title ? "impact-stats-title" : undefined}
      aria-label={
        impactStatsSection.title ? undefined : "Institution statistics"
      }
      className="rsac-home-section rsac-impact-stats geo-dark-band relative overflow-hidden border-y border-white/10 px-5 py-24 sm:px-8 sm:py-28 md:px-12 lg:px-20"
    >
      <div
        aria-hidden="true"
        className="rsac-tricolor-sweep absolute inset-x-0 top-0 h-1"
      />
      <div className="rsac-geo-mesh rsac-geo-mesh--dark" aria-hidden="true" />

      <div className="rsac-blobs" aria-hidden="true">
        <span className="rsac-blob rsac-blob--saffron h-72 w-72 left-[-4rem] top-[-3rem]" />
        <span className="rsac-blob rsac-blob--2 rsac-blob--blue h-80 w-80 right-[-5rem] top-[20%]" />
        <span className="rsac-blob rsac-blob--3 rsac-blob--green h-72 w-72 bottom-[-4rem] left-[35%]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {hasIntro && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.65 }}
            className="mb-14 max-w-3xl"
          >
            {impactStatsSection.eyebrow && (
              <p className="rsac-kicker rsac-home-eyebrow flex items-center gap-2.5 text-orange-300">
                <span
                  className="geo-tricolor-bar"
                  style={{ height: "1.05rem" }}
                  aria-hidden="true"
                />
                {impactStatsSection.eyebrow}
              </p>
            )}
            {impactStatsSection.title && (
              <MaskReveal
                as="h2"
                id="impact-stats-title"
                className="rsac-display mt-5 text-[2rem] font-[800] leading-[1.08] tracking-[-0.02em] text-white md:text-[3rem]"
              >
                {impactStatsSection.title}
              </MaskReveal>
            )}
            {impactStatsSection.description && (
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                {impactStatsSection.description}
              </p>
            )}
          </motion.div>
        )}

        {stats.length > 0 && (
          <RevealStagger
            as="dl"
            className="grid overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:grid-cols-2 xl:grid-cols-3"
          >
            {stats.map((stat) => (
              <RevealItem
                as="div"
                key={stat.id || stat.label}
                className="group relative overflow-hidden border-b border-r border-white/10 bg-white/[0.03] px-8 py-10 transition duration-300 last:border-b-0 hover:bg-white/[0.07] rsac-shine"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-orange-400 transition-transform duration-500 group-hover:scale-x-100"
                />

                {stat.label && (
                  <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {stat.label}
                  </dt>
                )}
                {stat.value && (
                  <dd className="mt-3 text-4xl font-black tabular-nums leading-none text-orange-300 lg:text-5xl">
                    <CountUp value={stat.value} />
                  </dd>
                )}
                {stat.detail && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {stat.detail}
                  </p>
                )}
              </RevealItem>
            ))}
          </RevealStagger>
        )}
      </div>
    </section>
  );
};

export default GeoStats;
