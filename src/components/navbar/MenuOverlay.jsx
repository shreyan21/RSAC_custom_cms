import { Home, Orbit } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMenuItems, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const getSectionKey = (item) => {
  const source = `${item.path || ""} ${item.title || ""}`.toLowerCase();

  if (source.includes("about")) return "about";
  if (source.includes("division")) return "divisions";
  if (source.includes("facilit")) return "facilities";
  if (source.includes("academic") || source.includes("training")) {
    return "academics";
  }
  if (source.includes("portal")) return "geoportals";
  if (source.includes("flood")) return "flood";
  if (source.includes("gallery") || source.includes("photo")) return "gallery";
  if (source.includes("faq")) return "faq";
  if (source.includes("contact")) return "contact";
  if (source.includes("people") || source.includes("manpower")) return "people";
  if (
    source.includes("public") ||
    source.includes("tender") ||
    source.includes("rti")
  ) {
    return "public";
  }
  return "home";
};

const getSectionForPath = (sections, pathname) =>
  sections.find((section) => {
    if (section.path === "/") {
      return pathname === "/";
    }

    return pathname === section.path || pathname.startsWith(`${section.path}/`);
  }) ||
  sections.find((section) =>
    section.children.some((link) => {
      if (link.external) return false;
      const [linkPath] = link.path.split("#");
      return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
    })
  ) ||
  sections[0];

const MenuLink = ({ link, current, closeMenu, compact = false }) => {
  const content = (
    <span className="min-w-0">
      <span className="block text-base font-bold leading-snug text-white sm:text-lg">
        {link.label}
      </span>
      {link.description && (
        <span className="mt-1 block text-xs font-semibold leading-relaxed text-white/64 sm:text-sm">
          {link.description}
        </span>
      )}
    </span>
  );
  const className = `group flex items-start gap-4 border-b border-white/12 py-4 text-left no-underline transition-colors hover:border-orange-200/45 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200 ${
    compact ? "px-1" : "px-2"
  } ${current ? "bg-white/[0.055]" : ""}`;

  if (link.external) {
    return (
      <a
        href={link.path}
        target="_blank"
        rel="noreferrer"
        onClick={closeMenu}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={link.path}
      onClick={closeMenu}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {content}
    </Link>
  );
};

const MenuOverlay = ({ isOpen, setIsOpen }) => {
  const menuItems = useMenuItems();
  const { branding, ui } = useSiteSettings();
  const { t } = useLanguage();
  const location = useLocation();
  const navigationRef = useRef(null);
  const homeButtonRef = useRef(null);
  const sectionButtonRefs = useRef([]);
  const previousFocusRef = useRef(null);
  const sections = useMemo(
    () =>
      menuItems
        .filter((item) => {
          const isHomeSection =
            getSectionKey(item) === "home" ||
            item.path === "/" ||
            String(item.title || "").trim().toLowerCase() === "home";

          return !isHomeSection;
        })
        .map((item, index) => {
          const iconKey = getSectionKey(item);

          return {
            key: `${iconKey}-${index}`,
            iconKey,
            title: item.title,
            path: item.path || "/",
            description: item.description || "",
            children: (item.links || []).map((link) => ({
              ...link,
              external:
                link.external || /^https?:\/\//i.test(link.path || ""),
            })),
          };
        }),
    [menuItems]
  );
  const routeSectionKey =
    getSectionForPath(sections, location.pathname)?.key || sections[0]?.key;
  const [preferredActiveKey, setPreferredActiveKey] = useState("");
  const activeKey = preferredActiveKey || routeSectionKey;
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.key === activeKey)
  );
  const activeSection = sections[activeIndex] || sections[0];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;

    const focusSection = (index) => {
      const count = sections.length;

      if (!count) return;
      sectionButtonRefs.current[(index + count) % count]?.focus();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      const sectionIndex = sectionButtonRefs.current.indexOf(
        document.activeElement
      );

      if (sectionIndex !== -1) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusSection(sectionIndex + 1);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          focusSection(sectionIndex - 1);
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          focusSection(0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          focusSection(sections.length - 1);
          return;
        }
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          navigationRef.current?.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter((element) => element.getClientRects().length > 0);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => homeButtonRef.current?.focus(), 80);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, routeSectionKey, sections, setIsOpen]);

  if (!isOpen || !activeSection) {
    return null;
  }

  const selectSection = (sectionKey) => {
    setPreferredActiveKey((current) =>
      current === sectionKey ? current : sectionKey
    );
  };

  const closeMenu = () => {
    setPreferredActiveKey("");
    setIsOpen(false);
  };

  const isCurrentPath = (path) => {
    const [linkPath, hash] = path.split("#");

    if (hash) {
      return location.pathname === linkPath && location.hash === `#${hash}`;
    }

    return location.pathname === linkPath;
  };

  // Sections without sub-links (Gallery, Tenders, FAQ) still get a right-panel
  // item — a single link to the section itself — so they read like every other
  // section instead of leaving the previous section's links showing.
  const detailLinks =
    activeSection.children.length > 0
      ? activeSection.children
      : [
          {
            label: activeSection.title,
            description: activeSection.description,
            path: activeSection.path,
          },
        ];

  return (
    <div
      id="main-menu-dialog"
      ref={navigationRef}
      role="dialog"
      aria-modal="true"
      aria-label={ui?.menuHeading || t("Main menu")}
      data-lenis-prevent
      className="rsac-menu-overlay rsac-mega-menu fixed inset-0 z-[180] h-[100dvh] overflow-y-auto bg-[#050d1c] text-white lg:overflow-hidden"
    >
      <div className="rsac-mega-menu__texture" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-5 sm:px-8 md:px-12 lg:h-full lg:px-16 xl:px-20">
        <header className="flex shrink-0 items-center justify-between border-b border-white/16 py-5 sm:py-6">
          <Link
            to="/"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-200"
            aria-label={branding.organisationName}
          >
            <img
              src={branding.logo}
              alt=""
              data-essential-image="true"
              className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
            />
            <span className="min-w-0">
              <span className="hidden truncate text-sm font-bold text-white sm:block sm:text-base">
                {t(branding.organisationName)}
              </span>
              {branding.subtitle && (
                <span className="mt-1 hidden line-clamp-2 text-[11px] font-medium leading-snug text-white/60 sm:block">
                  {branding.subtitle}
                </span>
              )}
            </span>
          </Link>

          <Link
            ref={homeButtonRef}
            to="/"
            onClick={closeMenu}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-orange-100 transition duration-150 hover:text-orange-200 active:scale-90 active:bg-white/10 active:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-200"
            aria-label={t("Home")}
            title={t("Home")}
          >
            <Home className="h-6 w-6" aria-hidden="true" />
          </Link>
        </header>

        <nav
          aria-label={ui?.menuHeading || t("Main navigation")}
          className="grid flex-1 gap-8 py-8 lg:min-h-0 lg:grid-cols-[minmax(300px,0.82fr)_minmax(440px,1.18fr)] lg:gap-14 lg:py-10 xl:grid-cols-[minmax(360px,0.8fr)_minmax(520px,1.2fr)] xl:gap-20"
        >
          <div className="lg:min-h-0 lg:overflow-y-auto lg:pr-5">
            <div role="list" className="border-t border-white/16">
              {sections.map((section, index) => {
                const isActive = section.key === activeSection.key;
                // Every left row is a SELECTOR: it reveals the section's target
                // link(s) on the right (desktop) or below (mobile) — it never
                // navigates on its own. Childless sections (Gallery, Tender, FAQ)
                // reveal a single link to their own page, so the left item stops
                // masquerading as a direct link (no hand cursor, no direct jump);
                // the right-side card stays the real navigation target.
                const sectionLinks =
                  section.children.length > 0
                    ? section.children
                    : [
                        {
                          label: section.title,
                          description: section.description,
                          path: section.path,
                        },
                      ];
                const rowClass =
                  "rsac-mega-menu__section group flex w-full cursor-default items-center gap-3 py-3 text-left no-underline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange-200 sm:py-3.5";
                const titleSpan = (
                  <span className="rsac-mega-menu__section-title min-w-0 flex-1 text-[clamp(1.15rem,2.4vw,2rem)] leading-tight">
                    {t(section.title)}
                  </span>
                );

                return (
                  <div
                    key={section.key}
                    role="listitem"
                    className="border-b border-white/16"
                  >
                    <button
                      ref={(element) => {
                        sectionButtonRefs.current[index] = element;
                      }}
                      type="button"
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") {
                          selectSection(section.key);
                        }
                      }}
                      onFocus={() => selectSection(section.key)}
                      onClick={() => selectSection(section.key)}
                      aria-expanded={isActive}
                      aria-controls={
                        isActive ? `menu-section-${section.key}` : undefined
                      }
                      className={`${rowClass} ${isActive ? "is-active" : ""}`}
                    >
                      {titleSpan}
                    </button>

                    {isActive && (
                      <div
                        id={`menu-section-${section.key}`}
                        className="rsac-mega-menu__mobile-links pb-5 pl-4 lg:hidden"
                      >
                        {sectionLinks.map((link) => (
                          <MenuLink
                            key={`${section.key}-${link.path}`}
                            link={link}
                            current={!link.external && isCurrentPath(link.path)}
                            closeMenu={closeMenu}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <section
            id="main-menu-detail"
            className="rsac-mega-menu__detail hidden min-h-0 border-l border-white/16 pl-10 lg:flex lg:flex-col xl:pl-16"
            aria-label={`${t(activeSection.title)} ${t("links")}`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-3 pt-2">
              <div className="grid gap-x-7 xl:grid-cols-2">
                {detailLinks.map((link) => (
                  <MenuLink
                    key={`${activeSection.key}-${link.path}`}
                    link={link}
                    current={!link.external && isCurrentPath(link.path)}
                    closeMenu={closeMenu}
                  />
                ))}
              </div>
            </div>
          </section>
        </nav>

        <footer className="hidden shrink-0 items-center justify-between border-t border-white/16 py-4 text-xs text-white/48 lg:flex">
          <span>{ui?.menuKeyboardHint || t("Use arrow keys to move through sections.")}</span>
          <span className="inline-flex items-center gap-2">
            <Orbit className="h-4 w-4 text-orange-200" aria-hidden="true" />
            {ui?.menuDestinations || t("Remote sensing, GIS and public services")}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default MenuOverlay;
