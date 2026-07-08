import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import OrganisationChartDiagram from "../../components/organisation/OrganisationChartDiagram";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const OrganisationChartPage = () => {
  const [expanded, setExpanded] = useState(false);
  const { organisationChart, pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.organisationChart;

  useEffect(() => {
    if (!expanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  return (
    <>
      <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={organisationChart.intro}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "About Us", to: "/about-us" },
        { label: c.title },
      ]}
      actions={
        <>
          <BackButton fallback="/about-us" label={c.backLabel} />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#102f46] shadow-sm transition duration-300 hover:border-[#0b6fa4]/30 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b6fa4]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            {t("Open full chart")}
          </button>
        </>
      }
    >
      {organisationChart.roles?.length ? (
        <section
          aria-labelledby="official-chart-image"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_56px_rgba(18,50,74,0.07)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0b6fa4]">
              {t("Published Structure")}
            </p>
            <h2
              id="official-chart-image"
              className="mt-1 text-lg font-extrabold text-[#102f46]"
            >
              {t("Official organisational chart")}
            </h2>
          </div>
          <figure className="bg-white p-2 sm:p-4 lg:p-6">
            <OrganisationChartDiagram roles={organisationChart.roles} />
            <figcaption className="mt-3 px-2 text-center text-xs font-medium text-slate-500 sm:hidden">
              {t("Swipe horizontally to view the complete chart")}
            </figcaption>
          </figure>
        </section>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          {t("Organisational chart is awaiting publication.")}
        </p>
      )}
      </PageShell>

      {expanded && organisationChart.roles?.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-chart-title"
          className="fixed inset-0 z-[300] flex flex-col bg-[#071b18]/96 p-3 backdrop-blur-md sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-4 text-white">
            <h2 id="expanded-chart-title" className="text-base font-extrabold sm:text-xl">
              {t("Official organisational chart")}
            </h2>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              autoFocus
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={t("Close full chart")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white p-2 sm:p-4">
            <OrganisationChartDiagram roles={organisationChart.roles} />
          </div>
        </div>
      )}
    </>
  );
};

export default OrganisationChartPage;
