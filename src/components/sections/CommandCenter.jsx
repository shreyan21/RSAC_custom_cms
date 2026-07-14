import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  FileText,
  Pause,
  Play,
  UserRoundCheck,
  Waves,
} from "lucide-react";
import { useState } from "react";
import MaskReveal from "../motion/MaskReveal";
import { Link } from "react-router-dom";
import { useNotices, useOfficials, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const getInitials = (name) =>
  name
    .replace(/^Shri\s+|^Smt\.\s+|^Dr\.\s+/i, "")
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

const getProfileImage = (profile) =>
  profile?.photo || profile?.image || profile?.portrait || "";

const CommandCenter = () => {
  const notices = useNotices();
  const officials = useOfficials();
  const { leadershipUpdates } = useSiteSettings().homeSections;
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [noticesPaused, setNoticesPaused] = useState(false);
  const marqueePaused = shouldReduceMotion || noticesPaused;
  return (
    <section id="leadership-updates" className="rsac-home-section relative scroll-mt-36 overflow-hidden bg-[linear-gradient(145deg,#fff7ed_0%,#f8fbf7_48%,#edf7ff_100%)] px-5 py-20 sm:px-8 md:px-12 lg:px-20">
      <div className="rsac-geo-mesh" aria-hidden="true" />
      <div aria-hidden="true" className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-orange-300/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0_33.33%,#ffffff_33.33%_66.66%,#138808_66.66%_100%)]"
      />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="rsac-home-eyebrow text-xs font-extrabold uppercase tracking-[0.24em] text-[#c2410c]">
                {t(leadershipUpdates.leadershipEyebrow)}
              </p>

              <MaskReveal as="h2" className="rsac-display mt-4 text-[2rem] font-[800] leading-[1.08] tracking-[-0.018em] text-[#102f46] md:text-[2.85rem]">
                {t(leadershipUpdates.leadershipTitle)}
              </MaskReveal>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {officials.slice(0, 5).map((official) => (
              <article
                key={official.id}
                className="group relative min-h-[184px] overflow-hidden rounded-xl border border-orange-200/55 bg-white/90 p-5 shadow-[0_16px_40px_rgba(18,50,74,0.08)] transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white rsac-shine"
              >
                <div className="flex items-center gap-4">
                  <div className="rsac-icon-bob grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-orange-200 bg-orange-50 text-[#c2410c]">
                    <UserRoundCheck className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="rsac-circular-portrait grid h-16 w-16 shrink-0 place-items-center border border-slate-200 bg-white text-sm font-extrabold text-[#12324a] shadow-sm">
                    {getProfileImage(official) ? (
                      <img
                        src={getProfileImage(official)}
                        alt={official.name}
                        className="rsac-circular-portrait__image"
                        style={{
                          objectPosition: official.objectPosition || "center 22%",
                        }}
                      />
                    ) : (
                      getInitials(official.name)
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-base font-extrabold leading-snug text-[#102f46]">
                    {t(official.name)}
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#0f6f42]">
                    {t(official.role)}
                  </p>

                  {official.department && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {t(official.department)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-sky-200/70 bg-white/92 p-5 shadow-[0_22px_58px_rgba(18,50,74,0.1)] sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="rsac-home-eyebrow text-xs font-extrabold uppercase tracking-[0.24em] text-[#0b6fa4]">
                {t(leadershipUpdates.updatesEyebrow)}
              </p>

              <MaskReveal as="h2" className="rsac-display mt-4 text-[2rem] font-[800] leading-[1.08] tracking-[-0.018em] text-[#102f46] md:text-[2.85rem]">
                {t(leadershipUpdates.updatesTitle)}
              </MaskReveal>
            </div>

            <button
              type="button"
              onClick={() => setNoticesPaused((paused) => !paused)}
              aria-pressed={marqueePaused}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700/15 bg-emerald-50 px-3 py-2 text-sm font-bold text-[#0f6f42] transition hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0f6f42]"
            >
              {marqueePaused ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
              {marqueePaused
                ? t(leadershipUpdates.playLabel)
                : t(leadershipUpdates.pauseLabel)}
            </button>
          </div>

          <div className="mt-8 h-[410px] overflow-hidden">
            <div
              className={`notice-marquee space-y-4 ${
                marqueePaused
                  ? ""
                  : "animate-[scrollNotices_18s_linear_infinite]"
              }`}
            >
              {[...notices, ...notices].map((notice, index) => (
                <article
                  key={`${notice.title}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-[#fbfdfc] px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white hover:shadow-[0_12px_30px_rgba(18,50,74,0.08)]"
                >
                  {/* Accent rail — wipes in on hover. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[#f97316] transition-transform duration-300 group-hover:scale-y-100"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c2410c]">
                      <Building2 className="h-3 w-3" aria-hidden="true" />
                      {t(notice.category) || t(leadershipUpdates.attribution)}
                    </span>

                    {notice.lastDate && (
                      <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                        {t("Last Date")}: {notice.lastDate}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 font-semibold leading-relaxed text-[#102f46]">
                    {t(notice.title)}
                  </p>

                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {t(leadershipUpdates.attribution)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 border-t border-slate-200 pt-5">
            <Link
              to="/notices"
              className="group inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#f97316] px-3.5 py-2 text-xs font-extrabold text-white transition duration-300 hover:bg-[#ea580c] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f97316]"
            >
              {t("All notices")}
              <ArrowRight
                className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/tenders"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#102f46] transition duration-300 hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f97316]"
            >
              <FileText className="h-3.5 w-3.5 text-[#c2410c]" aria-hidden="true" />
              {t("Tenders")}
            </Link>
            <Link
              to="/flood-reports"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#102f46] transition duration-300 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0b6fa4]"
            >
              <Waves className="h-3.5 w-3.5 text-[#0b6fa4]" aria-hidden="true" />
              {t("Flood reports")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommandCenter;
