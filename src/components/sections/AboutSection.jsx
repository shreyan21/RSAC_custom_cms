import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { cmsIconMap, resolveCmsIcon } from "../icons/cmsIconRegistry";
import ScrollScale from "../motion/ScrollScale";
import { RevealStagger, RevealItem } from "../motion/RevealStagger";
import MaskReveal from "../motion/MaskReveal";

// Restrained official accent set — green, blue, gold. Keeps cards distinct
// without the startup-style rainbow.
const accentPalette = ["#0f6f42", "#0b6fa4", "#b7892f"];

const AboutSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const { about } = useSiteSettings();
  const { t } = useLanguage();
  const primaryAction = about.primaryAction === undefined
    ? { label: t("About RSAC-UP"), path: "/about-us/read-more-about-us" }
    : about.primaryAction;
  const secondaryAction = about.secondaryAction === undefined
    ? { label: t("Organisation Chart"), path: "/organisation-chart" }
    : about.secondaryAction;
  const PrimaryActionIcon = primaryAction?.icon
    ? cmsIconMap[primaryAction.icon] || ArrowRight
    : null;
  const SecondaryActionIcon = secondaryAction?.icon
    ? cmsIconMap[secondaryAction.icon] || ArrowRight
    : null;

  return (
    <section
      id="about-rsac"
      className="rsac-home-section relative overflow-hidden bg-gradient-to-b from-[#f0f9f4] via-[#f6fbf8] to-[#edf5fc] px-5 py-28 sm:px-8 sm:py-32 md:px-12 lg:px-20"
    >
      <div
        aria-hidden="true"
        className="rsac-tricolor-sweep absolute inset-x-0 top-0 h-1"
      />
      <div className="rsac-geo-mesh" aria-hidden="true" />
      <div className="rsac-blobs" aria-hidden="true">
        <span className="rsac-blob rsac-blob--green h-80 w-80 left-[-5rem] top-[-4rem]" />
        <span className="rsac-blob rsac-blob--2 rsac-blob--blue h-72 w-72 right-[-4rem] bottom-[8%]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.92fr] lg:items-start">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.75 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          {about.eyebrow && (
            <p className="rsac-kicker rsac-home-eyebrow flex items-center gap-2.5 text-[#c2410c]">
              <span
                className="geo-tricolor-bar"
                style={{ height: "1.05rem" }}
                aria-hidden="true"
              />
              {about.eyebrow}
            </p>
          )}

          {about.title && (
            <MaskReveal className="rsac-display mt-5 text-[2.1rem] font-[800] leading-[1.06] tracking-[-0.02em] text-[#102f46] md:text-[3.4rem]">
              {about.title}
            </MaskReveal>
          )}

          <hr className="rsac-luxe-rule mt-7" aria-hidden="true" />

          <p className="rsac-measure mt-7 text-lg leading-[1.85] text-slate-700">
            {about.body}
          </p>

          <RevealStagger className="mt-8 space-y-4" amount={0.15}>
            {about.capabilities.map((item, index) => {
              const Icon = resolveCmsIcon(item.icon, resolveCmsIcon("satellite"));
              const accentHex = accentPalette[index % accentPalette.length];

              return (
                <RevealItem
                  as="article"
                  key={index}
                  className="group rsac-card-depth rsac-shine relative flex gap-4 overflow-hidden rounded-xl border border-emerald-900/8 bg-white/90 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(15,111,66,0.1)]"
                  style={{ "--rsac-accent": accentHex }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                    style={{ backgroundColor: accentHex }}
                  />

                  <div
                    className="rsac-portal-icon rsac-icon-bob relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors duration-300"
                    style={{ color: accentHex, backgroundColor: `${accentHex}14` }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="relative z-[1]">
                    <h3 className="font-bold text-[#102f46]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {item.text}
                    </p>
                  </div>

                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: accentHex }}
                  />
                </RevealItem>
              );
            })}
          </RevealStagger>
        </motion.div>

        <ScrollScale
          className="rsac-card-depth relative rounded-xl border border-slate-200/80 bg-white/95 p-6 sm:p-7"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-[linear-gradient(90deg,#ff9933_0_33.33%,#ffffff_33.33%_66.66%,#138808_66.66%_100%)]"
          />

          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#0b6fa4]/10 text-[#0b6fa4]">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b6fa4]">
                {about.snapshotEyebrow}
              </p>
              <h3 className="rsac-display mt-2 text-2xl font-[800] leading-tight tracking-[-0.015em] text-[#102f46]">
                {about.snapshotTitle}
              </h3>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            {about.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-lg border border-slate-200/60 bg-[#f8fbfd]/80 p-4 transition-colors duration-300 hover:bg-[#f0f7fa]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {fact.label}
                </p>
                <p className="mt-2 text-lg font-extrabold leading-snug text-[#102f46]">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3 rounded-lg border border-emerald-900/10 bg-emerald-50/70 p-4">
            <GraduationCap
              className="mt-0.5 h-5 w-5 shrink-0 text-[#0f6f42]"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-slate-700">
              {about.note}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {primaryAction?.label && primaryAction?.path && (
              <Link
                to={primaryAction.path}
                className="geo-btn-saffron group inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f97316]"
              >
                {PrimaryActionIcon && <PrimaryActionIcon className="h-4 w-4" aria-hidden="true" />}
                {primaryAction.label}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            )}
            {secondaryAction?.label && secondaryAction?.path && (
              <Link
                to={secondaryAction.path}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#102f46] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b6fa4]"
              >
                {SecondaryActionIcon && <SecondaryActionIcon className="h-4 w-4" aria-hidden="true" />}
                {secondaryAction.label}
              </Link>
            )}
          </div>
        </ScrollScale>
      </div>
    </section>
  );
};

export default AboutSection;
