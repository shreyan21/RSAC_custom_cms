import ProfileFlipCard from "../../components/cards/ProfileFlipCard";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useTechnicalProfiles, useSiteSettings } from "../../hooks/useData";

const TechnicalStaffPage = () => {
  const technicalProfiles = useTechnicalProfiles();
  const { pageContent } = useSiteSettings();
  const c = pageContent.technicalStaff;
  return (
    <PageShell
      className="rsac-people-directory rsac-people-directory--technical"
      eyebrow={c.eyebrow}
      title={c.title}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "People", to: "/manpower" },
        { label: c.eyebrow },
      ]}
      actions={<BackButton fallback="/manpower" label={c.backLabel} />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {technicalProfiles.map((profile, index) => (
          <ProfileFlipCard
            key={`${profile.profileType || "technical"}-${profile.id || profile.employeeId || profile.name}-${index}`}
            profile={profile}
          />
        ))}
      </div>
    </PageShell>
  );
};

export default TechnicalStaffPage;
