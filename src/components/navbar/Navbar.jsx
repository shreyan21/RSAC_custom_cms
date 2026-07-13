import { useEffect, useState } from "react";
import MenuButton from "./MenuButton";
import MenuOverlay from "./MenuOverlay";
import { Link, useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { scrollToTop } from "../../utils/scroll";
import rsacLogoFallback from "../../assets/images/rsac-logo.webp";
import upEmblemFallback from "../../assets/images/up-emblem.webp";

const HeaderLogoLink = ({ logo, onClick, children, className = "" }) => {
  const link = logo?.link || "/";
  const classes = `rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b6fa4] ${className}`;

  if (/^https?:\/\//i.test(link)) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={logo.title || logo.alt}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={link} onClick={onClick} className={classes} aria-label={logo.title || logo.alt}>
      {children}
    </Link>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { branding } = useSiteSettings();
  const { t } = useLanguage();
  const configuredLogos = branding.logos?.length
    ? branding.logos
    : [
        {
          id: "rsac",
          title: branding.shortName,
          alt: "RSAC-UP logo",
          image: branding.logo,
          link: "/",
          placement: "primary",
        },
        {
          id: "up-government",
          title: "Government of Uttar Pradesh",
          alt: "Government of Uttar Pradesh emblem",
          image: branding.governmentLogo,
          link: "/",
          placement: "supporting",
        },
      ];
  const primaryLogo =
    configuredLogos.find((logo) => logo.placement === "primary") ||
    configuredLogos[0];
  const supportingLogos = configuredLogos.filter(
    (logo) => logo !== primaryLogo && logo.image
  );
  const headerTone = isOpen
    ? "bg-[#041220] border-b border-white/10 shadow-[0_16px_48px_rgba(4,18,32,0.22)]"
    : scrolled
      ? "bg-white border-b border-emerald-900/10 shadow-[0_12px_40px_rgba(18,50,74,0.08)]"
      : "bg-transparent";
  // Home has a dark hero behind the transparent navbar → light text when not
  // scrolled. Inner pages are light at the top → keep dark text.
  const onHome = location.pathname === "/";
  const overDark = isOpen || (onHome && !scrolled);
  const titleTone = overDark ? "text-white" : "text-[#12324a]";
  const subtitleTone = overDark ? "text-white/72" : "text-slate-600";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 30;
        setScrolled((current) => current === nextScrolled ? current : nextScrolled);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;

    body.style.overflow = isOpen ? "hidden" : "";
    body.classList.toggle("rsac-menu-open", isOpen);
    window.dispatchEvent(
      new CustomEvent("rsac:menu-visibility", {
        detail: { open: isOpen },
      })
    );

    return () => {
      body.style.overflow = previousOverflow;

      if (isOpen) {
        body.classList.remove("rsac-menu-open");
        window.dispatchEvent(
          new CustomEvent("rsac:menu-visibility", {
            detail: { open: false },
          })
        );
      }
    };
  }, [isOpen]);

  const handleHomeLinkClick = () => {
    setIsOpen(false);

    if (location.pathname === "/") {
      window.setTimeout(() => scrollToTop(), 0);
    }
  };

  return (
    <>
      <TopBar />
      {/* NAVBAR */}
      <header
        className={`rsac-navbar fixed top-10 left-0 z-[120] w-full transition-[background-color,border-color,box-shadow] duration-200 ${headerTone}`}
      >
        <div className="rsac-navbar__inner flex items-start justify-between gap-4 px-4 py-3 sm:px-6 md:px-12 lg:px-20">
          {/* LOGO AREA */}
          <HeaderLogoLink
            logo={primaryLogo}
            onClick={handleHomeLinkClick}
            className="flex min-w-0 flex-1 items-start gap-3 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b6fa4]"
          >

            {/* LEFT RSAC LOGO */}
            <img
              src={primaryLogo.image || branding.logo}
              alt={t(primaryLogo.alt || "RSAC-UP logo")}
              data-essential-image="true"
              onError={(event) => {
                if (!event.currentTarget.src.endsWith(rsacLogoFallback)) {
                  event.currentTarget.src = rsacLogoFallback;
                }
              }}
              className="rsac-brand-mark w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] object-contain shrink-0"
            />

            {/* TITLE */}
            <div className="min-w-0">

              <p className={`${titleTone} text-sm md:text-lg font-bold leading-normal truncate pt-0.5 transition-colors duration-300`}>

                {t(branding.organisationName)}

              </p>

              <p className={`mt-1 line-clamp-2 text-[9px] font-medium leading-[1.45] transition-colors duration-300 sm:text-[10px] md:text-xs md:leading-relaxed ${subtitleTone}`}>

                {branding.subtitle}

              </p>

            </div>

          </HeaderLogoLink>

          {/* MENU BUTTON */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {supportingLogos.length > 0 && (
            <div
              className="flex max-w-[42vw] items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] sm:max-w-[18rem] sm:gap-2 [&::-webkit-scrollbar]:hidden"
              aria-label={t("Government and partner logos")}
            >
              {supportingLogos.map((logo) => {
                const isGovernmentEmblem = /government of uttar pradesh/i.test(
                  `${logo.title} ${logo.alt}`
                );

                return (
                  <HeaderLogoLink
                    key={logo.id || logo.title}
                    logo={logo}
                    onClick={handleHomeLinkClick}
                    className="flex shrink-0 items-center justify-center rounded-full"
                  >
                    <img
                      src={logo.image}
                      alt={t(logo.alt || logo.title || "Official logo")}
                      data-essential-image="true"
                      onError={(event) => {
                        if (
                          isGovernmentEmblem &&
                          !event.currentTarget.src.endsWith(upEmblemFallback)
                        ) {
                          event.currentTarget.src = upEmblemFallback;
                        }
                      }}
                      className={`rsac-brand-mark h-[clamp(2rem,4.2vw,3rem)] w-[clamp(2rem,4.2vw,3rem)] object-contain transition-[filter] duration-200 ${
                        isGovernmentEmblem ? "rsac-government-emblem rounded-full" : ""
                      } ${
                        overDark
                          ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.42)]"
                          : "drop-shadow-[0_2px_4px_rgba(15,23,42,0.22)]"
                      }`}
                    />
                  </HeaderLogoLink>
                );
              })}
            </div>
          )}

          <MenuButton
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />

        </div>

        </div>
      </header>

      {/* OVERLAY */}
      <MenuOverlay isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
};

export default Navbar;
