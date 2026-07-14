import { motion, useReducedMotion } from "framer-motion";
import {
  Bird,
  Building2,
  Database,
  Droplets,
  Globe2,
  Layers3,
  Map as MapIcon,
  ScanLine,
  Satellite,
  ShieldCheck,
  Sprout,
  Trees,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { RevealStagger, RevealItem } from "../motion/RevealStagger";
import MaskReveal from "../motion/MaskReveal";

const iconMap = {
  satellite: Satellite,
  map: MapIcon,
  scan: ScanLine,
  trees: Trees,
  sprout: Sprout,
  building2: Building2,
  droplets: Droplets,
  shield: ShieldCheck,
  layers: Layers3,
  database: Database,
  bird: Bird,
  globe: Globe2,
};

// Restrained official accent set — blue, green, gold, teal. No rainbow.
const accentPalette = ["#0b6fa4", "#0f6f42", "#b7892f", "#0f766e"];

const ServicesSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const { services, applications } = useSiteSettings();
  const { t } = useLanguage();
  const baseId = useId();
  const tabRefs = useRef([]);

  const tabs = [
    services?.items?.length && {
      key: "services",
      label: services.tabLabel || "Scientific Services",
      eyebrow: services.eyebrow,
      title: services.title,
      description: services.description,
      items: services.items,
    },
    applications?.items?.length && {
      key: "applications",
      label: applications.tabLabel || "Operational Programmes",
      eyebrow: applications.eyebrow,
      title: applications.title,
      description: applications.description,
      items: applications.items,
    },
  ].filter(Boolean);

  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const activeTab = tabs.find((tab) => tab.key === activeKey) || tabs[0];

  if (!tabs.length) {
    return null;
  }

  const focusTab = (index) => {
    const next = (index + tabs.length) % tabs.length;
    setActiveKey(tabs[next].key);
    tabRefs.current[next]?.focus();
  };

  const handleTabKeyDown = (event, index) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="rsac-home-section relative overflow-hidden bg-gradient-to-b from-[#fdf6ee] via-[#f7fbf8] to-[#eef6fb] px-5 py-28 sm:px-8 sm:py-32 md:px-12 lg:px-20"
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
        <span className="rsac-blob rsac-blob--saffron h-80 w-80 right-[-5rem] top-[-3rem]" />
        <span className="rsac-blob rsac-blob--2 rsac-blob--violet h-72 w-72 left-[-4rem] bottom-[6%]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.7 }}
          className="max-w-3xl"
        >
          {activeTab.eyebrow && (
            <p className="rsac-kicker rsac-home-eyebrow flex items-center gap-2.5 text-[#c2410c]">
              <span
                className="geo-tricolor-bar"
                style={{ height: "1.05rem" }}
                aria-hidden="true"
              />
              {activeTab.eyebrow}
            </p>
          )}
          {activeTab.title && (
            <MaskReveal
              as="h2"
              key={activeTab.key}
              id="services-title"
              className="rsac-display mt-5 text-[2.1rem] font-[800] leading-[1.06] tracking-[-0.02em] text-[#102f46] md:text-[3.4rem]"
            >
              {activeTab.title}
            </MaskReveal>
          )}
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            {activeTab.description}
          </p>
        </motion.div>

        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label={t("Service categories")}
            className="mt-10 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-[#f7fbfe] p-1.5 shadow-sm"
          >
            {tabs.map((tab, index) => {
              const isActive = tab.key === activeTab.key;

              return (
                <button
                  key={tab.key}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveKey(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`relative min-h-10 rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] ${
                    isActive
                      ? "bg-[#0b6fa4] text-white shadow-[0_8px_22px_rgba(11,111,164,0.24)]"
                      : "text-slate-600 hover:bg-white hover:text-[#0b6fa4]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <RevealStagger
          as="ul"
          key={activeTab.key}
          role="tabpanel"
          id={`${baseId}-panel-${activeTab.key}`}
          aria-labelledby={`${baseId}-tab-${activeTab.key}`}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
            {activeTab.items.map((item, index) => {
              const Icon = iconMap[item.icon] || Satellite;
              const accentHex = accentPalette[index % accentPalette.length];

              return (
                <RevealItem
                  as="li"
                  key={item.id}
                  className="group relative flex gap-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(18,50,74,0.09)] rsac-card-depth rsac-shine"
                  style={{ "--rsac-accent": accentHex }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                    style={{ backgroundColor: accentHex }}
                  />

                  <div
                    className="rsac-portal-icon rsac-icon-bob relative z-[1] grid h-12 w-12 shrink-0 place-items-center self-start rounded-lg transition-colors duration-300"
                    style={{ color: accentHex, backgroundColor: `${accentHex}14` }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <div className="relative z-[1] min-w-0">
                    {item.category && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f6f42]">
                        {item.category}
                      </p>
                    )}
                    <h3 className="mt-0.5 text-base font-extrabold leading-snug text-[#102f46]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
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
      </div>
    </section>
  );
};

export default ServicesSection;
