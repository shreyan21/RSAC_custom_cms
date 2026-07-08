import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  HelpCircle,
  Images,
  Map as MapIcon,
  Phone,
  ScrollText,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuickLinks, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import MaskReveal from "../motion/MaskReveal";
import { RevealStagger, RevealItem } from "../motion/RevealStagger";

const iconMap = {
  images: Images,
  help: HelpCircle,
  notices: ScrollText,
  flood: Waves,
  map: MapIcon,
  document: FileText,
  shield: ShieldCheck,
  phone: Phone,
};

const QuickAccess = () => {
  const { t } = useLanguage();
  const links = useQuickLinks();
  const { pageContent } = useSiteSettings();
  const c = pageContent?.quickAccess || {};
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="quick-access-title"
      className="relative overflow-hidden bg-gradient-to-b from-[#eef6fb] via-[#f4f9fb] to-[#f0f7f4] px-5 py-20 sm:px-8 sm:py-24 md:px-12 lg:px-20"
    >
      <div aria-hidden="true" className="rsac-tricolor-sweep absolute inset-x-0 top-0 h-1" />
      <div className="rsac-geo-mesh" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.65 }}
          className="max-w-3xl"
        >
          <p className="rsac-kicker flex items-center gap-2.5 text-[#c2410c]">
            <span
              className="geo-tricolor-bar"
              style={{ height: "1.05rem" }}
              aria-hidden="true"
            />
            {c.eyebrow || t("Quick Access")}
          </p>
          <MaskReveal
            as="h2"
            id="quick-access-title"
            className="rsac-display mt-4 text-[1.9rem] font-[800] leading-[1.08] tracking-[-0.02em] text-[#102f46] md:text-[2.8rem]"
          >
            {c.title || t("Jump straight to the most-used pages")}
          </MaskReveal>
        </motion.div>

        <RevealStagger
          as="ul"
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        >
          {links.map((link) => {
            const Icon = iconMap[link.iconKey] || FileText;
            const path = link.path || "/";
            const accent = link.accent || "#0b6fa4";

            return (
              <RevealItem as="li" key={link.key || path} className="h-full">
                <Link
                  to={path}
                  className="group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_46px_rgba(18,50,74,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] sm:p-5 rsac-card-depth rsac-shine"
                  style={{ "--rsac-accent": accent }}
                >
                  {/* Accent top bar — wipes in on hover. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: accent }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                    style={{ backgroundColor: accent }}
                  />
                  <span
                    className="rsac-icon-bob grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors duration-300"
                    style={{ color: accent, backgroundColor: `${accent}14` }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold leading-snug text-[#102f46] sm:text-base">
                      {t(link.title)}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                      {t(link.description)}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 transition group-hover:text-[#102f46]">
                    {c.openLabel || t("Open")}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </RevealStagger>
      </div>
    </section>
  );
};

export default QuickAccess;
