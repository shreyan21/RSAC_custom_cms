import PageShell from "../components/layout/PageShell";
import BackButton from "../components/navigation/BackButton";
import MobileAppsGrid from "../components/sections/MobileAppsGrid";
import { useSiteSettings } from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";

// Standalone page for the "Mobile Apps" home tab. Renders the same download
// grid used inside the Geo-Portal page, so both stay identical from one source.
const MobileAppsPage = () => {
  const { t } = useLanguage();
  const { pageContent } = useSiteSettings();
  const c = pageContent.contact || {};
  const portal = pageContent.geoportals || {};

  return (
    <PageShell
      eyebrow={portal.eyebrow}
      title={c.mobileAppsHeading}
      intro={c.mobileAppsIntro}
      breadcrumbs={[
        { label: t("Home"), to: "/" },
        { label: c.mobileAppsHeading },
      ]}
      actions={<BackButton fallback="/" label={c.backLabel} />}
    >
      <MobileAppsGrid showHeading={false} />
    </PageShell>
  );
};

export default MobileAppsPage;
