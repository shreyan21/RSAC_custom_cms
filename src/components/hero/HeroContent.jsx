import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { cmsIconMap } from "../icons/cmsIconRegistry";
import HeroLeaderPortraits from "./HeroLeaderPortraits";
import MaskReveal from "../motion/MaskReveal";

const HeroContent = () => {
  const shouldReduceMotion = useReducedMotion();
  const { hero } = useSiteSettings();
  const { t } = useLanguage();
  const stats = (hero.stats || []).filter(Boolean);
  const riseIn = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } };
  const PrimaryIcon = cmsIconMap[hero.primaryAction.icon] || cmsIconMap.map;
  const SecondaryIcon = cmsIconMap[hero.secondaryAction.icon] || cmsIconMap.satellite;
  const lead = (hero.highlights || []).filter(Boolean).join("  ·  ");

  return (
    <div className="hero-content-panel relative z-10 w-full max-w-4xl">
      {hero.eyebrow && (
        <motion.div
          {...riseIn}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.1] py-2 pl-2.5 pr-4"
        >
          <span
            className="geo-tricolor-bar"
            style={{ height: "1.05rem" }}
            aria-hidden="true"
          />
          <span className="rsac-kicker rsac-home-eyebrow text-orange-200/95">
            {hero.eyebrow}
          </span>
        </motion.div>
      )}

      <MaskReveal
        as="h1"
        id="hero-title"
        duration={1}
        className="rsac-display hero-main-title whitespace-normal text-[clamp(1.25rem,3.1vw,1.95rem)] font-[800] leading-[1.18] tracking-[-0.022em] text-white sm:whitespace-nowrap"
      >
        {hero.title},{" "}
        <span className="text-white">{hero.accentTitle}</span>
      </MaskReveal>

      <div
        aria-hidden="true"
        className="mt-5 h-[3px] w-24 rounded-full bg-[linear-gradient(90deg,var(--rsac-gold)_0%,var(--rsac-gold-soft)_60%,transparent_100%)]"
      />

      {lead && (
        <motion.p
          {...riseIn}
          transition={{ delay: 0.22, duration: 0.9 }}
          className="hero-lead mt-6 max-w-2xl text-[0.95rem] font-medium leading-[1.75] text-slate-200/90 sm:text-lg"
        >
          {lead}
        </motion.p>
      )}

      {stats.length > 0 && (
        <motion.dl
          {...riseIn}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="hero-inline-stats mt-6 flex flex-wrap gap-x-7 gap-y-3"
        >
          {stats.map((stat) => (
            <div
              key={`${stat.label}-${stat.value}`}
              className="flex items-baseline gap-2"
            >
              <dd className="text-lg font-extrabold leading-none text-white sm:text-xl">
                {t(stat.value)}
              </dd>
              {stat.label && (
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-200/80">
                  {t(stat.label)}
                </dt>
              )}
            </div>
          ))}
        </motion.dl>
      )}

      <motion.div
        {...riseIn}
        transition={{ delay: 0.36, duration: 0.9 }}
        className="hero-action-links mt-8 flex flex-wrap gap-3"
      >
        <Link
          to={hero.primaryAction.path}
          className="rsac-shine rsac-shine--dark geo-btn-saffron group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-full px-6 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f97316] sm:text-base"
        >
          <PrimaryIcon className="h-5 w-5" aria-hidden="true" />
          {hero.primaryAction.label}
          <ArrowRight
            className="h-4 w-4 transition duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>

        <Link
          to={hero.secondaryAction.path}
          className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/22 bg-white/[0.12] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_28px_rgba(2,6,14,0.35)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.18] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rsac-gold-soft)] sm:text-base"
        >
          <SecondaryIcon className="h-5 w-5 text-orange-300" aria-hidden="true" />
          {hero.secondaryAction.label}
        </Link>
      </motion.div>

      <div className="hero-mobile-leaders mt-7 flex justify-start md:hidden">
        <HeroLeaderPortraits />
      </div>
    </div>
  );
};

export default HeroContent;
