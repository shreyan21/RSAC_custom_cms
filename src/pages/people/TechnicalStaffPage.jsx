import { Link } from "react-router-dom";
import ProfileFlipCard from "../../components/cards/ProfileFlipCard";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useTechnicalProfiles, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const TechnicalStaffPage = () => {
  const technicalProfiles = useTechnicalProfiles();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const c = pageContent.technicalStaff;
  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "People", to: "/manpower" },
        { label: c.eyebrow },
      ]}
      actions={
        <>
          <BackButton fallback="/manpower" label={c.backLabel} />
          <Link
            to="/administration"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0f6f42] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
          >
            {t("Administration")}
          </Link>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {technicalProfiles.map((profile) => (
          <ProfileFlipCard key={profile.name} profile={profile} />
        ))}
      </div>
    </PageShell>
  );
};

export default TechnicalStaffPage;
