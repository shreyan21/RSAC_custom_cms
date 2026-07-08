import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { useGeoportals, useSiteSettings } from "../../hooks/useData";
import { RevealStagger, RevealItem } from "../motion/RevealStagger";
import MaskReveal from "../motion/MaskReveal";

const GeoportalSection = () => {
  const geoportals = useGeoportals();
  const shouldReduceMotion = useReducedMotion();
  const { geoportals: sectionContent } = useSiteSettings().homeSections;

  return (
    <section
      id="geoportals"
      aria-labelledby="geoportals-title"
      className="relative overflow-hidden bg-gradient-to-b from-[#f2f8fc] via-[#edf6fa] to-[#f0f7f4] px-5 py-28 sm:px-8 sm:py-32 md:px-12 lg:px-20"
    >
      <div
        aria-hidden="true"
        className="rsac-tricolor-sweep absolute inset-x-0 top-0 h-1"
      />
      <div
        aria-hidden="true"
        className="rsac-geo-mesh"
      />
      <div className="rsac-blobs" aria-hidden="true">
        <span className="rsac-blob rsac-blob--blue h-80 w-80 left-[-5rem] top-[-3rem]" />
        <span className="rsac-blob rsac-blob--2 rsac-blob--green h-72 w-72 right-[-4rem] bottom-[8%]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.7 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="rsac-kicker text-[#0b6fa4]">
            {sectionContent.eyebrow}
          </p>

          <MaskReveal
            as="h2"
            id="geoportals-title"
            className="rsac-display mt-5 text-[2.1rem] font-[800] leading-[1.06] tracking-[-0.02em] text-[#102f46] md:text-[3.4rem]"
          >
            {sectionContent.title}
          </MaskReveal>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600">
            {sectionContent.description}
          </p>
        </motion.div>

        <RevealStagger className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {geoportals.map((portal) => {
            const Icon = portal.icon || Globe2;
            const accentHex = portal.accentHex || "#0b6fa4";

            return (
              <RevealItem
                as="article"
                key={portal.title}
                className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_52px_rgba(18,50,74,0.12)] rsac-card-depth rsac-shine"
                style={{ "--rsac-accent": accentHex }}
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-0.5 ${portal.accent || "bg-[#0b6fa4]"}`}
                />

                {/* Colored glow bloom on hover, tinted by the portal accent. */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25 ${portal.accent || "bg-[#0b6fa4]"}`}
                />

                <Icon
                  aria-hidden="true"
                  className="rsac-watermark h-28 w-28"
                  style={{ color: accentHex }}
                />

                <div className="relative z-[1]">
                  <div
                    className="rsac-portal-icon rsac-icon-bob grid h-12 w-12 place-items-center rounded-lg border transition-colors duration-300"
                    style={{
                      color: accentHex,
                      backgroundColor: `${accentHex}14`,
                      borderColor: `${accentHex}33`,
                    }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>

                <h3 className="relative z-[1] mt-5 text-xl font-extrabold leading-snug text-[#102f46]">
                  {portal.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {portal.description}
                </p>

                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0f6f42]/8 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#0f6f42] transition duration-300 group-hover:bg-[#0f6f42] group-hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0f6f42]"
                >
                  {sectionContent.actionLabel}
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </a>

                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${portal.accent || "bg-[#0b6fa4]"}`}
                />
              </RevealItem>
            );
          })}
        </RevealStagger>
      </div>
    </section>
  );
};

export default GeoportalSection;
