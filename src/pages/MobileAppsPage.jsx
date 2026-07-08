import PageShell from "../components/layout/PageShell";
import BackButton from "../components/navigation/BackButton";
import MobileAppsGrid from "../components/sections/MobileAppsGrid";
import { useSiteSettings } from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";

// Standalone page for the "Mobile Apps" home tab. Renders the same download
// grid used inside the Geo-Portal page, so both stay identical from one source.
const MobileAppsPage = () => {
  const { isHindi } = useLanguage();
  const { pageContent } = useSiteSettings();
  const c = pageContent.geoportals;

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.mobileAppsHeading || (isHindi ? "मोबाइल ऐप्स" : "Mobile Apps")}
      intro={
        c.mobileAppsIntro ||
        (isHindi
          ? "आरएसएसी-यूपी द्वारा विकसित मोबाइल ऐप डाउनलोड करें।"
          : "Download mobile applications developed by RSAC-UP.")
      }
      breadcrumbs={[
        { label: isHindi ? "मुखपृष्ठ" : "Home", to: "/" },
        { label: isHindi ? "मोबाइल ऐप्स" : "Mobile Apps" },
      ]}
      actions={<BackButton fallback="/" label={c.backLabel} />}
    >
      <MobileAppsGrid showHeading={false} />
    </PageShell>
  );
};

export default MobileAppsPage;
