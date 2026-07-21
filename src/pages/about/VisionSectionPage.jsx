import { Layers, ListChecks, Workflow } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

// One dedicated page per RSAC tab (Objective / Implementation / Approach /
// Sphere of Activities). Content is the exact same source as the combined
// /vision page (visionMissionContent + CMS pageContent.visionMission), so
// editing stays in one place — this only presents a single section as its own
// page so each tab "opens a new page".

const ObjectivesBody = ({ c }) => (
  <section>
    <ol className="grid gap-3 sm:grid-cols-2">
      {(c.objectives || []).map((item, i) => (
        <li
          key={item}
          className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(18,50,74,0.04)]"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f6f42] text-sm font-extrabold text-white">
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-slate-700">{item}</span>
        </li>
      ))}
    </ol>
  </section>
);

const ApproachBody = ({ c }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
    <ul className="space-y-3">
      {(c.approach || []).map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          <span
            aria-hidden="true"
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b6fa4]"
          />
          {item}
        </li>
      ))}
    </ul>
  </section>
);

const ImplementationBody = ({ c }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
    <p className="text-sm leading-relaxed text-slate-700">
      {c.implementationIntro}
    </p>
    <ul className="mt-4 space-y-3">
      {(c.implementation || []).map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          <span
            aria-hidden="true"
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6f42]"
          />
          {item}
        </li>
      ))}
    </ul>
  </section>
);

const SphereBody = ({ c }) => (
  <div className="grid gap-5 md:grid-cols-2">
    {(c.sphere || []).map((group) => (
      <article
        key={group.name}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
      >
        <h2 className="text-lg font-extrabold text-[#0b5f38]">{group.name}</h2>
        <ul className="mt-3 space-y-2">
          {(group.items || []).map((item) => (
            <li
              key={item}
              className="flex gap-2.5 text-sm leading-relaxed text-slate-700"
            >
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6f42]"
              />
              {item}
            </li>
          ))}
        </ul>
      </article>
    ))}
  </div>
);

const sectionConfig = {
  objectives: {
    icon: ListChecks,
    getTitle: (c) => c.objectivesHeading,
    getIntro: () => "",
    Body: ObjectivesBody,
  },
  implementation: {
    icon: Workflow,
    getTitle: (c) => c.implementationHeading,
    getIntro: () => "",
    Body: ImplementationBody,
  },
  approach: {
    icon: Workflow,
    getTitle: (c) => c.approachHeading,
    getIntro: () => "",
    Body: ApproachBody,
  },
  sphere: {
    icon: Layers,
    getTitle: (c) => c.sphereHeading,
    getIntro: (c) => c.sphereIntro,
    Body: SphereBody,
  },
};

const VisionSectionPage = ({ section }) => {
  const { t } = useLanguage();
  const { pageContent } = useSiteSettings();
  const c = pageContent?.visionMission || {};
  const config = sectionConfig[section] || sectionConfig.objectives;
  const { Body } = config;
  const title = config.getTitle(c);
  const intro = config.getIntro(c);

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={title}
      intro={intro}
      breadcrumbs={[
        { label: t("Home"), to: "/" },
        { label: t("About Us"), to: "/about-us" },
        { label: c.title, to: "/vision" },
        { label: title },
      ]}
      actions={<BackButton fallback="/" label={c.back} />}
    >
      <Body c={c} />
    </PageShell>
  );
};

export default VisionSectionPage;
