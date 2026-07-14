import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { usePolicies, useRsacOfficialSections, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";


const peoplePaths = new Set([
  "/leadership",
  "/scientists",
  "/technical-staff",
  "/administration",
  "/manpower",
]);

const getOfficialPagePath = (section, page) => {
  if (section.key === "about-us" && page.slug === "organisational-chart") {
    return "/organisation-chart";
  }

  return `/${section.route}/${page.slug}`;
};

const SitemapPage = () => {
  const policyPages = usePolicies();
  const rsacOfficialSections = useRsacOfficialSections();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.sitemap;
  const getSection = (key) =>
    rsacOfficialSections.find((section) => section.key === key);

  const getPageLinks = (sectionKey, options = {}) => {
    const section = getSection(sectionKey);

    if (!section) {
      return [];
    }

    return section.pages
      .filter((page) => !(options.excludeSlugs || []).includes(page.slug))
      .map((page) => ({
        label: page.title,
        path: getOfficialPagePath(section, page),
      }));
  };

  const sitemapSections = [
    {
      title: c.sectionTitles.primary,
      links: c.primaryLinks,
    },
    {
      title: c.sectionTitles.aboutPeople,
      links: c.peopleLinks,
    },
    {
      title: c.sectionTitles.divisions,
      links: [
        {
          label: c.allDivisionsLabel,
          path: "/divisions",
        },
        ...getPageLinks("divisions"),
      ],
    },
    {
      title: c.sectionTitles.facilities,
      links: [
        {
          label: c.allFacilitiesLabel,
          path: "/facilities",
        },
        ...getPageLinks("facilities"),
      ],
    },
    {
      title: c.sectionTitles.academics,
      links: [
        {
          label: c.academicsLabel,
          path: "/academics",
        },
        ...getPageLinks("academics"),
      ],
    },
    {
      title: c.sectionTitles.publicInformation,
      links: c.publicLinks,
    },
    {
      title: c.sectionTitles.policiesHelp,
      links: [
        {
          label: c.screenReaderLabel,
          path: "/screen-reader-access",
        },
        ...policyPages.map((policy) => ({
          label: policy.title,
          path: `/${policy.slug}`,
        })),
      ],
    },
  ];

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      actions={<BackButton fallback="/" />}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sitemapSections.map((section) => (
          <article
            key={section.title}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
          >
            <h2 className="text-xl font-extrabold text-[#102f46]">
              {t(section.title)}
            </h2>

            <div className="mt-5 space-y-2">
              {section.links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  state={peoplePaths.has(link.path) ? { backTo: { path: "/sitemap", label: c.backLabel } } : undefined}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-[#0f6f42]"
                >
                  {t(link.label)}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
};

export default SitemapPage;
