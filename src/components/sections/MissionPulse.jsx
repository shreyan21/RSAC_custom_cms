import {
  ArrowRight,
  Building2,
  Database,
  Droplets,
  Map,
  Mountain,
  Orbit,
  Satellite,
  ShieldCheck,
  Sprout,
  Trees,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";
import MaskReveal from "../motion/MaskReveal";

const icons = {
  database: Database,
  droplets: Droplets,
  sprout: Sprout,
  trees: Trees,
  mountain: Mountain,
  building2: Building2,
  shield: ShieldCheck,
};

const panelPlacements = {
  overlay:
    "hidden lg:block absolute left-1/2 top-1/2 z-30 w-[min(26.5rem,92%)] -translate-x-1/2 -translate-y-1/2",
  inline: "lg:hidden relative z-30 mx-auto mt-5 w-full max-w-md",
};

const getOrbitCardStyle = (index, total) => {
  const count = Math.max(total, 1);
  const angle = (-90 + (360 / count) * index) * (Math.PI / 180);
  const radius = count > 6 ? 45 : 43;

  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
    transform: "translate(-50%, -50%)",
  };
};

const DomainBriefPanel = ({
  domain,
  content,
  onClose,
  placement = "inline",
}) => {
  const panelRef = useRef(null);
  const Icon = icons[domain.icon] || Database;

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: placement === "overlay" });
  }, [domain.id, placement]);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={`${domain.label} — ${content.panelHeading || "Domain Brief"}`}
      className={`${panelPlacements[placement]} overflow-hidden rounded-2xl border border-orange-200/28 bg-[#04101c]/96 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_44px_rgba(249,115,22,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:p-6`}
    >
      {/* HUD corner brackets */}
      <span aria-hidden="true" className="absolute left-2 top-2 h-3.5 w-3.5 border-l-2 border-t-2 border-orange-300/70" />
      <span aria-hidden="true" className="absolute right-2 top-2 h-3.5 w-3.5 border-r-2 border-t-2 border-orange-300/70" />
      <span aria-hidden="true" className="absolute bottom-2 left-2 h-3.5 w-3.5 border-b-2 border-l-2 border-orange-300/70" />
      <span aria-hidden="true" className="absolute bottom-2 right-2 h-3.5 w-3.5 border-b-2 border-r-2 border-orange-300/70" />

      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-orange-200/85">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"
          />
          {content.panelHeading || "Domain Brief"}
        </p>

        <button
          type="button"
          onClick={onClose}
          aria-label={content.panelCloseLabel || "Close brief"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-white/70 transition hover:border-orange-200/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-200/22 bg-orange-200/12 text-orange-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold leading-tight text-white">
            {domain.label}
          </h3>
          {domain.tagline && (
            <p className="mt-0.5 truncate text-xs font-semibold text-orange-100/64">
              {domain.tagline}
            </p>
          )}
        </div>
      </div>

      {domain.deliverables?.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {domain.deliverables.map((item) => (
            <li
              key={item}
              className="flex gap-2.5 text-[13px] leading-relaxed text-orange-50/82"
            >
              <span
                aria-hidden="true"
                className="mt-[7px] h-1 w-3 shrink-0 rounded-full bg-orange-300/60"
              />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        {(domain.stat?.value || domain.stat?.label) && (
          <p className="text-xs text-orange-100/60">
            {domain.stat.value && (
              <span className="mr-2 text-xl font-black tabular-nums text-orange-200">
                {domain.stat.value}
              </span>
            )}
            {domain.stat.label}
          </p>
        )}

        {domain.path && (
          <Link
            to={domain.path}
            className="group inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-200 px-3.5 py-2 text-xs font-extrabold text-[#071b2e] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
          >
            {domain.linkLabel || content.panelLinkLabel || "Open division"}
            <ArrowRight
              className="h-3.5 w-3.5 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    </div>
  );
};

const MissionPulse = () => {
  const { missionPulse = {} } = useSiteSettings();
  const [activeId, setActiveId] = useState(null);
  const triggerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const domains = missionPulse.domains || [];
  const activeDomain = domains.find((domain) => domain.id === activeId);
  const hasPrimaryAction =
    missionPulse.primaryAction?.label && missionPulse.primaryAction?.path;
  const hasSecondaryAction =
    missionPulse.secondaryAction?.label && missionPulse.secondaryAction?.path;
  const hasIntro =
    missionPulse.eyebrow ||
    missionPulse.title ||
    missionPulse.description ||
    missionPulse.hint ||
    hasPrimaryAction ||
    hasSecondaryAction;

  const closePanel = () => {
    setActiveId(null);
    triggerRef.current?.focus();
  };

  const toggleDomain = (event, domainId) => {
    triggerRef.current = event.currentTarget;
    setActiveId((current) => (current === domainId ? null : domainId));
  };

  useEffect(() => {
    if (!activeId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId]);

  if (!hasIntro && !domains.length) {
    return null;
  }

  return (
    <section
      id="mission-pulse"
      aria-labelledby="mission-pulse-title"
      className="relative bg-[#03111e] text-white"
    >
      <div className="relative flex min-h-[100svh] items-center overflow-hidden px-5 py-24 sm:px-8 md:px-12 lg:px-20">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(249,115,22,0.13),transparent_30%),radial-gradient(circle_at_22%_58%,rgba(16,185,129,0.1),transparent_28%),linear-gradient(145deg,#03111e_0%,#071b2e_54%,#041622_100%)]"
        />
        <div className="rsac-geo-mesh rsac-geo-mesh--dark" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
          <div className="relative z-20 max-w-xl">
            {missionPulse.eyebrow && (
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-200/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-100">
                <Orbit className="h-4 w-4" aria-hidden="true" />
                {missionPulse.eyebrow}
              </div>
            )}

            {missionPulse.title && (
              <MaskReveal
                as="h2"
                id="mission-pulse-title"
                className="rsac-display mt-6 text-[2.2rem] font-[800] leading-[1.05] tracking-[-0.02em] sm:text-4xl md:text-[3.2rem] xl:text-[3.7rem]"
              >
                {missionPulse.title}
              </MaskReveal>
            )}

            {missionPulse.description && (
              <p className="mt-6 text-base leading-[1.85] text-orange-50/70">
                {missionPulse.description}
              </p>
            )}

            {(hasPrimaryAction || hasSecondaryAction) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {hasPrimaryAction && (
              <Link
                to={missionPulse.primaryAction.path}
                className="group inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-200 px-4 py-2.5 text-sm font-extrabold text-[#071b2e] transition duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
              >
                <Satellite className="h-4 w-4" aria-hidden="true" />
                {missionPulse.primaryAction.label}
                <ArrowRight
                  className="h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              )}
              {hasSecondaryAction && (
              <Link
                to={missionPulse.secondaryAction.path}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/18 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:border-orange-200/40 hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
              >
                <Map className="h-4 w-4 text-orange-200" aria-hidden="true" />
                {missionPulse.secondaryAction.label}
              </Link>
              )}
            </div>
            )}

            {missionPulse.hint && (
              <p className="mt-8 max-w-md border-l border-orange-200/30 pl-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-100/48">
                {missionPulse.hint}
              </p>
            )}
          </div>

          <div className="relative">
            <div
              className="relative mx-auto aspect-square w-full max-w-[420px] sm:max-w-[500px] lg:max-w-[680px]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-[1%] rounded-full border border-orange-100/12 opacity-30"
              />
              <div
                aria-hidden="true"
                className="absolute inset-[9%] rounded-full border border-orange-200/18 shadow-[0_0_60px_rgba(249,115,22,0.1)]"
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-[9%] origin-center rounded-full border border-dashed border-orange-200/28"
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-[22%] origin-center rounded-full border border-dashed border-emerald-200/22"
              />
              <span aria-hidden="true" className="rsac-orb-ping" />
              <span aria-hidden="true" className="rsac-orb-satellite" />

              <div className="absolute inset-[29%] overflow-hidden rounded-full border border-orange-100/30 bg-[radial-gradient(circle_at_34%_28%,#39c6dc_0%,#0b6fa4_35%,#073653_64%,#031522_100%)] shadow-[0_0_60px_rgba(249,115,22,0.16)]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,transparent_48%,rgba(255,255,255,0.5)_49%,transparent_50%),linear-gradient(0deg,transparent_48%,rgba(255,255,255,0.34)_49%,transparent_50%)] bg-[size:34px_34px]"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/10 shadow-[0_0_45px_rgba(255,255,255,0.12)] sm:h-24 sm:w-24">
                    <Satellite
                      className="h-10 w-10 text-white sm:h-12 sm:w-12"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="absolute left-[12%] top-[20%] h-[2px] w-[76%] rotate-[12deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                />
                <span aria-hidden="true" className="rsac-radar-sweep" />
              </div>

              {/* Orbiting domain cards — large screens only. The whole ring
                  rotates with scroll; each card counter-rotates so it stays
                  upright and clickable. */}
              <motion.ul
                className="absolute inset-0 hidden origin-center lg:block"
                role="list"
              >
                {domains.map((domain, index) => {
                  const Icon = icons[domain.icon] || Database;
                  const isActive = activeId === domain.id;

                  return (
                    <li
                      key={domain.id || domain.label}
                      className={`absolute ${
                        domains.length > 6 ? "w-[24%] max-w-44" : "w-[30%] max-w-52"
                      } list-none`}
                      style={getOrbitCardStyle(index, domains.length)}
                    >
                      <motion.div
                        className="origin-center"
                        {...(shouldReduceMotion
                          ? {}
                          : {
                              initial: { opacity: 0, scale: 0.6 },
                              whileInView: { opacity: 1, scale: 1 },
                              viewport: { once: true, amount: 0.3 },
                              transition: {
                                duration: 0.5,
                                delay: index * 0.08,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            })}
                      >
                      <button
                        type="button"
                        onClick={(event) => toggleDomain(event, domain.id)}
                        aria-expanded={isActive}
                        className={`group w-full rounded-2xl border p-3 text-left text-white shadow-[0_20px_56px_rgba(0,0,0,0.28)] transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200 sm:p-4 ${
                          isActive
                            ? "border-orange-200/55 bg-[#0a2440]/85 shadow-[0_20px_56px_rgba(0,0,0,0.3),0_0_30px_rgba(249,115,22,0.2)]"
                            : "border-white/14 bg-[#071b2e]/72 hover:border-orange-200/40 hover:bg-[#0a2440]/80"
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="grid h-9 w-9 place-items-center rounded-xl border border-orange-100/15 bg-orange-100/10 text-orange-200">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span
                            aria-hidden="true"
                            className={`text-[10px] font-extrabold uppercase tracking-[0.18em] transition ${
                              isActive
                                ? "text-orange-200"
                                : "text-orange-100/30 group-hover:text-orange-200/70"
                            }`}
                          >
                            {isActive
                              ? `● ${missionPulse.cardOpenLabel || "Open"}`
                              : missionPulse.cardViewLabel || "View"}
                          </span>
                        </span>
                        {domain.label && (
                          <span className="mt-3 block text-sm font-extrabold sm:text-base">
                            {domain.label}
                          </span>
                        )}
                        {domain.detail && (
                          <span className="mt-1 block text-xs leading-relaxed text-orange-50/56">
                            {domain.detail}
                          </span>
                        )}
                      </button>
                      </motion.div>
                    </li>
                  );
                })}
              </motion.ul>

              {/* Desktop brief panel — overlays the orb */}
              {activeDomain && (
                <DomainBriefPanel
                  domain={activeDomain}
                  content={missionPulse}
                  onClose={closePanel}
                  placement="overlay"
                />
              )}
            </div>

            {/* Compact domain grid — small and medium screens */}
            <ul
              role="list"
              className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden"
            >
              {domains.map((domain) => {
                const Icon = icons[domain.icon] || Database;
                const isActive = activeId === domain.id;

                return (
                  <li key={`compact-${domain.id || domain.label}`}>
                    <button
                      type="button"
                      onClick={(event) => toggleDomain(event, domain.id)}
                      aria-expanded={isActive}
                      className={`flex min-h-[88px] w-full flex-col justify-between rounded-xl border p-3 text-left transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 ${
                        isActive
                          ? "border-orange-200/55 bg-[#0a2440]/90"
                          : "border-white/12 bg-white/[0.05] hover:border-orange-200/35"
                      }`}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-orange-100/15 bg-orange-100/10 text-orange-200">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="mt-2 block text-[13px] font-extrabold leading-tight text-white">
                        {domain.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Mobile brief panel — renders below the grid */}
            {activeDomain && (
              <DomainBriefPanel
                domain={activeDomain}
                content={missionPulse}
                onClose={closePanel}
                placement="inline"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionPulse;
