import ProfileFlipCard from "../../components/cards/ProfileFlipCard";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useLeadershipProfiles, useSiteSettings } from "../../hooks/useData";

const LeadershipPage = () => {
  const leadershipProfiles = useLeadershipProfiles();
  const { pageContent } = useSiteSettings();
  const c = pageContent.leadership;
  return (
    <PageShell
      className="rsac-people-directory rsac-people-directory--leadership"
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "People", to: "/manpower" },
        { label: c.eyebrow },
      ]}
      actions={<BackButton fallback="/manpower" label={c.backLabel} />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {leadershipProfiles.map((profile, index) => (
          <ProfileFlipCard
            key={`${profile.profileType || "leadership"}-${profile.id || profile.name}-${index}`}
            profile={profile}
            enableFlip={false}
          />
        ))}
      </div>
    </PageShell>
  );
};

export default LeadershipPage;
