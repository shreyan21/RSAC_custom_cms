import { Link } from "react-router-dom";
import ProfileFlipCard from "../../components/cards/ProfileFlipCard";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useLeadershipProfiles, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const LeadershipPage = () => {
  const leadershipProfiles = useLeadershipProfiles();
  const { pageContent } = useSiteSettings();
  const { t } = useLanguage();
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
      actions={
        <>
          <BackButton fallback="/manpower" label={c.backLabel} />
          <Link
            to="/scientists"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0f6f42] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
          >
            {t("View Scientists")}
          </Link>
        </>
      }
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
