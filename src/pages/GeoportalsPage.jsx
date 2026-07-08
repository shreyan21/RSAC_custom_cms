import { ArrowUpRight, Globe2 } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import BackButton from "../components/navigation/BackButton";
import MobileAppsGrid from "../components/sections/MobileAppsGrid";
import { useGeoportals, useSiteSettings } from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";

const GeoportalsPage = () => {
  const geoportals = useGeoportals();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.geoportals;
  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: c.eyebrow },
      ]}
      actions={<BackButton fallback="/" label={c.backLabel} />}
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {geoportals.map((portal) => {
          const Icon = portal.icon || Globe2;
          const accentHex = portal.accentHex || "#0b6fa4";

          return (
            <article
              key={portal.title}
              className="rsac-card-depth rsac-shine group relative min-h-[258px] overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_70px_rgba(18,50,74,0.13)]"
              style={{ "--rsac-accent": accentHex }}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${portal.accent}`} />

              {/* Colored glow bloom on hover, tinted by the portal accent. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25 ${portal.accent}`}
              />

              <Icon
                aria-hidden="true"
                className="rsac-watermark h-32 w-32"
                style={{ color: accentHex }}
              />

              <div className="relative z-[1] flex items-start gap-4">
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

              <h2 className="relative z-[1] mt-8 text-2xl font-extrabold leading-snug text-[#102f46]">
                {t(portal.title)}
              </h2>

              <p className="relative z-[1] mt-4 leading-relaxed text-slate-600">
                {t(portal.description)}
              </p>

              <a
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-[1] mt-8 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-[#0f6f42] transition duration-300 group-hover:border-[#0f6f42]/35 group-hover:bg-emerald-50"
              >
                {t("Open Portal")}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </a>

              <div
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${portal.accent}`}
              />
            </article>
          );
        })}
      </div>

      <section id="mobile-apps" className="mt-14">
        <MobileAppsGrid />
      </section>
    </PageShell>
  );
};

export default GeoportalsPage;
