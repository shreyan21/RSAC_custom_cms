import { Link, Navigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useGetPolicyBySlug, usePolicies } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const PolicyPage = ({ slug }) => {
  const { isHindi } = useLanguage();
  const getPolicyBySlug = useGetPolicyBySlug();
  const policyPages = usePolicies();
  const page = getPolicyBySlug(slug);

  if (!page) {
    return <Navigate to="/sitemap" replace />;
  }

  return (
    <PageShell
      eyebrow={isHindi ? "वेबसाइट नीति" : "Website Policy"}
      title={page.title}
      intro={page.summary}
      breadcrumbs={[
        { label: isHindi ? "मुखपृष्ठ" : "Home", to: "/" },
        { label: isHindi ? "वेबसाइट नीतियां" : "Website Policies" },
        { label: page.title },
      ]}
      actions={
        <>
          <BackButton
            fallback="/"
            label={isHindi ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}
          />
          <Link
            to="/sitemap"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#102f46] transition hover:border-[#0b6fa4]/35 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
          >
            {isHindi ? "साइटमैप देखें" : "View Sitemap"}
          </Link>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[0.7fr_0.3fr]">
        <div className="space-y-5">
          {page.sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
            >
              <h2 className="text-2xl font-extrabold text-[#102f46]">
                {section.heading}
              </h2>

              <p className="mt-4 leading-relaxed text-slate-700">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(18,50,74,0.06)] lg:sticky lg:top-36 lg:h-fit">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
            {isHindi ? "संबंधित नीतियां" : "Related Policies"}
          </p>

          <div className="mt-5 space-y-2">
            {policyPages.map((policy) => (
              <Link
                key={policy.slug}
                to={`/${policy.slug}`}
                className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  policy.slug === slug
                    ? "bg-emerald-50 text-[#0f6f42]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#102f46]"
                }`}
              >
                {policy.title}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
};

export default PolicyPage;
