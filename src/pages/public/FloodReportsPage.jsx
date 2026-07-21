import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Info,
  Map as MapIcon,
  Radar,
  ScanLine,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { getCmsFloodReportsByYear } from "../../data/customCmsClient";
import { useFloodData, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useDialog } from "../../hooks/useDialog";

const programmeIcons = {
  radar: Radar,
  map: MapIcon,
  scan: ScanLine,
};

const localizeReportMeta = (meta, t, isHindi) => {
  if (!meta || !isHindi) {
    return meta;
  }

  return String(meta)
    .replace(/\bPDF\b/g, t("PDF"))
    .replace(/\bEnglish\b/g, t("English"));
};

const FloodReportsPage = () => {
  const { floodSection, floodReports } = useFloodData();
  const { pageContent } = useSiteSettings();
  const { t, isHindi, language } = useLanguage();
  const { openDocument } = useDialog();
  const { year } = useParams();
  const [archiveResult, setArchiveResult] = useState({
    key: "",
    reports: [],
    error: false,
  });
  const c = pageContent.floodReports;

  useEffect(() => {
    if (!year) return undefined;

    let active = true;
    const requestKey = `${language}:${year}`;
    getCmsFloodReportsByYear(year, language)
      .then((reports) => {
        if (active) {
          setArchiveResult({ key: requestKey, reports, error: false });
        }
      })
      .catch(() => {
        if (active) {
          setArchiveResult({ key: requestKey, reports: [], error: true });
        }
      });

    return () => { active = false; };
  }, [language, year]);

  const archiveKey = year ? `${language}:${year}` : "";
  const archiveReady = Boolean(year) && archiveResult.key === archiveKey;
  const archiveLoading = Boolean(year) && !archiveReady;
  const archiveError = archiveReady && archiveResult.error;
  const archiveReports = archiveReady ? archiveResult.reports : [];
  const visibleReports = year ? archiveReports : floodReports;

  // Year buttons: editable list from CMS when provided, otherwise every
  // mirrored season.
  const archives = floodSection.archives || [];

  return (
    <PageShell
      eyebrow={t(floodSection.eyebrow)}
      title={
        year ? `${t("Flood")} ${year}` : t(floodSection.title)
      }
      intro={year ? undefined : t(floodSection.intro)}
      actions={
        <BackButton
          fallback={year ? "/flood-reports" : "/"}
          label={t(c.backLabel)}
        />
      }
    >
      {/* Season note */}
      <div className="flex gap-3 rounded-lg border border-sky-200/80 bg-sky-50/80 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0b6fa4]" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-slate-700">
          {t(floodSection.note)}
        </p>
      </div>

      {/* Flood programme cards */}
      <section aria-labelledby="flood-programme-title" className="mt-10">
        <h2
          id="flood-programme-title"
          className="text-2xl font-extrabold text-[#102f46]"
        >
          {t(floodSection.programmeHeading)}
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {floodSection.programmes.map((programme) => {
            const Icon = programmeIcons[programme.icon] || Waves;

            return (
              <article
                key={programme.id}
                className="rsac-card-depth rsac-shine group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#0b6fa4]/30 hover:shadow-[0_18px_46px_rgba(18,50,74,0.09)]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#0b6fa4] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
                />
                <div className="rsac-icon-bob relative z-[1] grid h-12 w-12 place-items-center rounded-lg bg-[#0b6fa4]/8 text-[#0b6fa4] group-hover:bg-[#0b6fa4] group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-extrabold leading-snug text-[#102f46]">
                  {t(programme.title)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t(programme.description)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Daily reports table */}
      <section aria-labelledby="flood-reports-title" className="mt-12">
        <h2
          id="flood-reports-title"
          className="text-2xl font-extrabold text-[#102f46]"
        >
          {t(c.heading)}
        </h2>

        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
          <div className="hidden border-b border-slate-200 bg-[#f8fbfd] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:grid md:grid-cols-[7rem_1fr_11rem_7rem] md:gap-4">
            <span>{t(c.columns.date)}</span>
            <span>{t(c.columns.report)}</span>
            <span>{t(c.columns.coverage)}</span>
            <span>{t(c.columns.action)}</span>
          </div>

          <div className="divide-y divide-slate-200">
            {archiveLoading && (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                {t("Loading content")}
              </p>
            )}
            {!archiveLoading && archiveError && (
              <p className="px-5 py-8 text-center text-sm font-semibold text-red-700">
                {t("Website content unavailable")}
              </p>
            )}
            {!archiveLoading && !archiveError && visibleReports.length === 0 && (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                {t("No reports have been published for this year yet.")}
              </p>
            )}
            {!archiveLoading && !archiveError && visibleReports.map((report) => (
              <article
                key={report.id}
                className="grid min-w-0 gap-3 px-4 py-5 transition hover:bg-[#f8fbfd] sm:px-5 md:grid-cols-[7rem_minmax(0,1fr)_11rem_7rem] md:items-center md:gap-4"
              >
                <p className="inline-flex items-center gap-2 text-sm font-bold tabular-nums text-[#0f6f42]">
                  <CalendarDays className="h-4 w-4 md:hidden" aria-hidden="true" />
                  <time dateTime={report.date}>{report.dateLabel}</time>
                </p>

                <div>
                  <h3 className="text-base font-extrabold leading-snug text-[#102f46]">
                    {t(report.title)}
                  </h3>
                  {report.meta && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {t(report.category)} | {localizeReportMeta(report.meta, t, isHindi)}
                    </p>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {t(report.coverage)}
                </p>

                <div className="md:text-right">
                  {report.url ? (
                    <button
                      type="button"
                      onClick={() =>
                        openDocument({ url: report.url, title: t(report.title) })
                      }
                      aria-label={`${t(report.title)} ${t("PDF")}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0b6fa4]/20 bg-[#0b6fa4]/8 px-3 py-2 text-sm font-bold text-[#0b6fa4] transition hover:bg-[#0b6fa4]/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {t("PDF")}
                    </button>
                  ) : (
                    <Link
                      to="/contact"
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-[#0f6f42]/25 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                    >
                      {t("Request")}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Year-wise archive */}
      {archives.length > 0 && (
        <section aria-labelledby="flood-archive-title" className="mt-12">
          <h2
            id="flood-archive-title"
            className="text-2xl font-extrabold text-[#102f46]"
          >
            {floodSection.archiveHeading || t("Year-wise flood archive")}
          </h2>

          <ul className="mt-5 flex flex-wrap gap-2.5" role="list">
            {archives.map((archive) => {
              const isActive = String(archive.year) === String(year);

              return (
                <li key={archive.year}>
                  <Link
                    to={`/flood-reports/${archive.year}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] ${
                      isActive
                        ? "border-[#0b6fa4] bg-[#0b6fa4] text-white"
                        : "border-slate-200 bg-white text-[#102f46] hover:border-[#0b6fa4]/35 hover:bg-sky-50 hover:text-[#0b6fa4]"
                    }`}
                    aria-label={`${t("Flood")} ${archive.year} ${t("reports")}`}
                  >
                    {t("Flood")} {archive.year}
                    <ArrowUpRight
                      className={`h-3.5 w-3.5 ${isActive ? "text-white/80" : "text-slate-400"}`}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Related portals */}
      <section aria-labelledby="flood-resources-title" className="mt-12">
        <h2
          id="flood-resources-title"
          className="text-2xl font-extrabold text-[#102f46]"
        >
          {t(floodSection.resourcesHeading)}
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {floodSection.resources.map((resource) => (
            <a
              key={resource.url}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rsac-card-depth rsac-shine group relative overflow-hidden flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#0f6f42]/30 hover:shadow-[0_18px_46px_rgba(18,50,74,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
            >
              <span>
                <span className="block text-base font-extrabold leading-snug text-[#102f46] transition group-hover:text-[#0f6f42]">
                  {t(resource.label)}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">
                  {t(resource.description)}
                </span>
              </span>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-[#0f6f42]"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>
      </section>
    </PageShell>
  );
};

export default FloodReportsPage;
