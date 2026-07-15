import {
  Accessibility,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useContactDetails,
  useDataContext,
  useIsContentLoading,
  useSiteSettings,
} from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useVisitorCount } from "../../hooks/useVisitorCount";

const formatReviewDate = (value, fallback, locale) => {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    ? `${value}T00:00:00`
    : value;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const hiddenStatutoryLinkTargets = new Set([
  "https://india.gov.in",
  "https://www.india.gov.in/my-government/citizens-charter",
  "/screen-reader-access",
  "/sitemap",
]);

const footerHeadingSizeClasses = {
  small: "text-sm",
  normal: "text-lg",
  large: "text-2xl",
};

const Footer = () => {
  const { isHindi } = useLanguage();
  const { contentVersion } = useDataContext();
  const contactDetails = useContactDetails();
  const { branding, footer } = useSiteSettings();
  const visitorCount = useVisitorCount();
  const contentLoading = useIsContentLoading();
  const currentYear = new Date().getFullYear();

  if (contentLoading) return null;

  const lastUpdated = contentVersion || footer.reviewDate;
  const reviewLabel = formatReviewDate(
    lastUpdated,
    footer.reviewLabel,
    isHindi ? "hi-IN" : "en-IN"
  );
  const contactHeading = footer.contactHeading || (isHindi ? "संपर्क" : "Contact");
  const contactHeadingSize = footerHeadingSizeClasses[footer.contactHeadingSize]
    || footerHeadingSizeClasses.normal;
  const statutoryLinks = (footer.statutoryLinks || []).filter(
    (link) => !hiddenStatutoryLinkTargets.has(link.path || link.url)
  );

  return (
    <footer className="relative overflow-hidden">

      {/* TRICOLOUR TOP ACCENT */}
      <div
        aria-hidden="true"
        className="h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
      />

      {/* MAIN TOP SECTION (dark Gati Shakti band) */}
      <div className="geo-dark-band relative border-t border-white/10">

        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#f97316_1px,transparent_1px),linear-gradient(to_bottom,#f97316_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:radial-gradient(circle_at_50%_0%,white,transparent_78%)]"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:px-12 lg:px-20">

          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            {/* COLUMN 1: CONTACT */}
            <section aria-labelledby="footer-contact-heading">
              <h2
                id="footer-contact-heading"
                className={`${contactHeadingSize} font-extrabold leading-tight text-white`}
              >
                {contactHeading}
              </h2>
              <div className="mt-6 space-y-3">
                <a
                  href={`mailto:${contactDetails.email}`}
                  className="flex items-center gap-2.5 rounded text-sm text-slate-300 transition hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                >
                  <Mail className="h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
                  {contactDetails.email}
                </a>
                <p className="flex items-center gap-2.5 text-sm text-slate-300">
                  <Phone className="h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
                  {contactDetails.phone}
                </p>
                <p className="flex items-start gap-2.5 text-sm text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
                  {contactDetails.address}
                </p>
              </div>
            </section>

            {/* COLUMN 2: RELATED INSTITUTIONS */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
                {footer.ecosystemEyebrow}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                {footer.ecosystemTitle}
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                {footer.relatedLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rsac-luxe-link inline-flex items-center gap-2 rounded text-sm font-semibold text-slate-300 transition duration-200 hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                    >
                      {link.name}
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-slate-500 transition"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {statutoryLinks.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
              {statutoryLinks.map((link) => {
                const LinkIcon =
                  link.icon === "accessibility" ? Accessibility : ExternalLink;
                const showIcon = link.icon === "accessibility" || link.external;
                const cls =
                  "geo-glass inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white/70 transition duration-300 hover:-translate-y-0.5 hover:border-orange-400/40 hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";

                return link.external ? (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cls}
                  >
                    {showIcon && (
                      <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {link.name}
                  </a>
                ) : (
                  <Link key={link.name} to={link.path} className={cls}>
                    {showIcon && (
                      <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {link.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* POLICY LINKS ROW */}
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-white/10 pt-7">
            {footer.policyLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="rsac-luxe-link rounded text-xs font-medium text-white/70 transition duration-200 hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM STRIP */}
      <div className="bg-gradient-to-b from-[#081b31] to-[#061524] text-white">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-12 lg:px-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="space-y-2">
              <p className="text-sm text-white/80">
                &copy; {currentYear}{" "}
                <span className="font-semibold">{branding.organisationName}</span>.
                {" "}
                {isHindi ? "सर्वाधिकार सुरक्षित।" : "All Rights Reserved."}
              </p>
              <p className="text-xs text-white/50">
                {footer.ownership}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                <a
                  href={`mailto:${contactDetails.email}`}
                  className="inline-flex items-center gap-1.5 rounded transition hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {footer.webInformationManagerLabel}: {contactDetails.email}
                </a>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-sm text-orange-300">
                {isHindi ? "अंतिम अद्यतन:" : "Last updated:"}{" "}
                <time dateTime={lastUpdated}>{reviewLabel}</time>
              </p>
              <p
                className="inline-flex items-center gap-2 text-xs text-white/65"
                aria-live="polite"
              >
                <UsersRound className="h-3.5 w-3.5 text-orange-300" aria-hidden="true" />
                {footer.visitorCountLabel}:{" "}
                <span className="font-bold tabular-nums text-white/85">
                  {visitorCount === null
                    ? footer.visitorCountUnavailable
                    : visitorCount.toLocaleString(isHindi ? "hi-IN" : "en-IN")}
                </span>
              </p>
              <p className="inline-flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-300" aria-hidden="true" />
                {footer.assuranceText}
              </p>
              <p className="text-xs text-white/55">{footer.poweredBy}</p>
            </div>

          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
