import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useMenuItems, useRsacOfficialSections, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const getRouteTitle = (pathname) => {
  const segment = pathname.split("/").filter(Boolean).at(-1) || "Page";
  return segment
    .replace(/\d+$/, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const RouteAnnouncer = () => {
  const { pathname } = useLocation();
  const menuItems = useMenuItems();
  const officialSections = useRsacOfficialSections();
  const { branding } = useSiteSettings();
  const { t } = useLanguage();
  const cmsRouteTitles = useMemo(() => {
    const entries = [];
    menuItems.forEach((item) => {
      entries.push([item.path, item.title]);
      (item.links || []).forEach((link) => entries.push([link.path, link.label]));
    });
    officialSections.forEach((section) => {
      entries.push([`/${section.route}`, section.title]);
      (section.pages || []).forEach((page) =>
        entries.push([`/${section.route}/${page.slug}`, page.title])
      );
    });
    return new Map(entries.filter(([path, title]) => path && title));
  }, [menuItems, officialSections]);
  const routeTitle = cmsRouteTitles.get(pathname) || t(getRouteTitle(pathname));
  const siteName = branding?.shortName || branding?.organisationName || "";

  useEffect(() => {
    document.title = `${routeTitle} | ${siteName}`;
  }, [routeTitle, siteName]);

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {t("Navigated to")} {routeTitle}
    </p>
  );
};

export default RouteAnnouncer;
