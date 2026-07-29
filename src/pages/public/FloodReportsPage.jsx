import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getCmsFloodReportsByYear } from "../../data/customCmsClient";
import { useFloodData, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useDialog } from "../../hooks/useDialog";

const localizeReportMeta = (meta, t, isHindi) => {
  if (!meta || !isHindi) {
    return meta;
  }

  return String(meta)
    .replace(/\bPDF\b/g, t("PDF"))
    .replace(/\bEnglish\b/g, t("English"));
};

const reportBatchSize = (value) =>
  Math.min(100, Math.max(5, Number(value) || 20));

const formatReportCount = (template, shown, total) =>
  String(template || "")
    .replaceAll("{shown}", String(shown))
    .replaceAll("{total}", String(total));

const FloodReportsPage = () => {
  const { floodSection } = useFloodData();
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
  const initialReportCount = reportBatchSize(c.initialVisibleCount);
  const reportListKey = `${language}:${year}:${initialReportCount}`;
  const [reportWindow, setReportWindow] = useState({
    key: reportListKey,
    count: initialReportCount,
  });
  const visibleReportCount =
    reportWindow.key === reportListKey
      ? reportWindow.count
      : initialReportCount;

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

    return () => {
      active = false;
    };
  }, [language, year]);

  const archiveKey = `${language}:${year}`;
  const archiveReady = archiveResult.key === archiveKey;
  const archiveLoading = !archiveReady;
  const archiveError = archiveReady && archiveResult.error;
  const reports = archiveReady ? archiveResult.reports : [];
  const displayedReports = reports.slice(0, visibleReportCount);
  const hasCompactReportList = reports.length > initialReportCount;
  const allReportsVisible = visibleReportCount >= reports.length;

  return (
    <PageShell title={`${floodSection.archiveItemLabel} ${year}`}>
      <section aria-label={`${floodSection.archiveItemLabel} ${year}`}>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
          <div className="hidden border-b border-slate-200 bg-[#f8fbfd] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:grid md:grid-cols-[5rem_minmax(0,1fr)_7rem] md:gap-4">
            <span>{c.columns.serial}</span>
            <span>{c.columns.subject}</span>
            <span>{c.columns.download}</span>
          </div>

          <div id="flood-report-list" className="divide-y divide-slate-200">
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
            {!archiveLoading && !archiveError && reports.length === 0 && (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                {t("No reports have been published for this year yet.")}
              </p>
            )}
            {!archiveLoading &&
              !archiveError &&
              displayedReports.map((report, index) => (
                <article
                  key={report.id}
                  className="grid min-w-0 gap-3 px-4 py-5 transition hover:bg-[#f8fbfd] sm:px-5 md:grid-cols-[5rem_minmax(0,1fr)_7rem] md:items-center md:gap-4"
                >
                  <p className="text-sm font-bold tabular-nums text-[#102f46]">
                    <span className="mr-2 text-xs font-semibold text-slate-500 md:hidden">
                      {c.columns.serial}
                    </span>
                    {index + 1}
                  </p>

                  <div>
                    <h2 className="text-base font-extrabold leading-snug text-[#102f46]">
                      {t(report.title)}
                    </h2>
                    {report.meta && (
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                        {localizeReportMeta(report.meta, t, isHindi)}
                      </p>
                    )}
                  </div>

                  <div className="md:text-right">
                    {report.url ? (
                      <button
                        type="button"
                        onClick={() =>
                          openDocument({
                            url: report.url,
                            title: t(report.title),
                          })
                        }
                        aria-label={`${t(report.title)} ${c.columns.download}`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0b6fa4]/20 bg-[#0b6fa4]/8 px-3 py-2 text-sm font-bold text-[#0b6fa4] transition hover:bg-[#0b6fa4]/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {t("View")}
                      </button>
                    ) : (
                      <Link
                        to="/contact"
                        className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-[#0f6f42]/25 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                      >
                        {t("Request")}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
          </div>

          {!archiveLoading && !archiveError && hasCompactReportList && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-[#f8fbfd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p
                className="text-center text-xs font-bold text-slate-500 sm:text-left"
                aria-live="polite"
              >
                {formatReportCount(
                  c.resultsSummary,
                  Math.min(visibleReportCount, reports.length),
                  reports.length,
                )}
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                {visibleReportCount > initialReportCount && (
                  <button
                    type="button"
                    aria-controls="flood-report-list"
                    onClick={() =>
                      setReportWindow({
                        key: reportListKey,
                        count: initialReportCount,
                      })
                    }
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[#0b6fa4]/35 hover:text-[#0b6fa4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] sm:w-auto"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    {c.showLessLabel}
                  </button>
                )}
                {!allReportsVisible && (
                  <button
                    type="button"
                    aria-controls="flood-report-list"
                    aria-expanded={visibleReportCount > initialReportCount}
                    onClick={() =>
                      setReportWindow({
                        key: reportListKey,
                        count: Math.min(
                          reports.length,
                          visibleReportCount + initialReportCount,
                        ),
                      })
                    }
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#0b6fa4]/25 bg-white px-4 py-2 text-sm font-bold text-[#0b6fa4] transition hover:border-[#0b6fa4]/45 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4] sm:w-auto"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    {c.showMoreLabel}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default FloodReportsPage;
