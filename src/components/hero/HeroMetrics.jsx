import { motion, useReducedMotion } from "framer-motion";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { resolveCmsIcon } from "../icons/cmsIconRegistry";

const accentDots = ["bg-[#ff9933]", "bg-[#0b6fa4]", "bg-[#b7892f]", "bg-[#138808]"];

const HeroMetrics = () => {
  const shouldReduceMotion = useReducedMotion();
  const { hero } = useSiteSettings();
  const { t } = useLanguage();
  const domains = (hero.domains || []).filter(Boolean);
  const capabilities = (hero.capabilityTags || []).filter(Boolean);

  if (!domains.length && !capabilities.length) {
    return null;
  }

  const rise = (delay = 0) =>
    shouldReduceMotion
      ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <section
      aria-label={t("RSAC-UP key metrics")}
      className="relative z-10 border-y border-slate-200/70 bg-white/70 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-8 md:px-12 lg:px-20">
        {(domains.length > 0 || capabilities.length > 0) && (
          <motion.div
            {...rise(0)}
            viewport={{ once: true, amount: 0.4 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-3"
          >
            {domains.map((item, index) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    accentDots[index % accentDots.length]
                  }`}
                />
                {item}
              </span>
            ))}

            {capabilities.map((item) => {
              const Icon = resolveCmsIcon(item.icon, resolveCmsIcon("layers"));

              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"
                >
                  <Icon className="h-4 w-4 text-[#0b6fa4]" aria-hidden="true" />
                  {item.label}
                </span>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HeroMetrics;
