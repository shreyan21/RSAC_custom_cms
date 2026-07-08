import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useManpowerGroups, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const ManpowerPage = () => {
  const manpowerGroups = useManpowerGroups();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.manpower;
  const location = useLocation();
  const backTo = location.state?.backTo;
  const backLabel = backTo?.label || c.backLabel;
  const backFallback = backTo?.path || "/";

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: c.eyebrow },
      ]}
      actions={<BackButton fallback={backFallback} label={backLabel} />}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {manpowerGroups.map((group) => (
          <article
            key={group.title}
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0_33.33%,#ffffff_33.33%_66.66%,#138808_66.66%_100%)]"
            />

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
              {group.count}
            </p>

            <h2 className="mt-4 text-2xl font-extrabold text-[#102f46]">
              {t(group.title)}
            </h2>

            <p className="mt-4 leading-relaxed text-slate-600">
              {t(group.text)}
            </p>

            <Link
              to={group.path}
              state={{ backTo: { path: "/manpower", label: "Back to People" } }}
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-bold text-[#0f6f42] transition hover:border-[#0f6f42]/35 hover:bg-emerald-50"
            >
              {t("View Details")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </PageShell>
  );
};

export default ManpowerPage;
