import { ArrowRight, ExternalLink, FileText, MapPin, Phone, UserRoundCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import FeedbackForm from "../../components/public/FeedbackForm";
import { usePublicInfoPages } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useDialog } from "../../hooks/useDialog";

const PublicInfoPage = ({ slug }) => {
  const { isHindi, t } = useLanguage();
  const { openDocument } = useDialog();
  const publicInfoPages = usePublicInfoPages();
  const page = publicInfoPages.find((item) => item.slug === slug);

  if (!page) {
    return <Navigate to="/sitemap" replace />;
  }

  return (
    <PageShell
      eyebrow={page.eyebrow || (isHindi ? "जन सेवाएं" : "Public Services")}
      title={page.title}
      intro={page.summary}
      breadcrumbs={[
        { label: isHindi ? "मुखपृष्ठ" : "Home", to: "/" },
        { label: isHindi ? "जन सेवाएं" : "Public Services" },
        { label: page.title },
      ]}
      actions={
        <>
          <BackButton
            fallback="/"
            label={isHindi ? "मुखपृष्ठ पर वापस जाएं" : "Back to Home"}
          />
          <Link
            to="/sitemap"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#102f46] transition hover:border-[#0b6fa4]/35 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
          >
            {isHindi ? "साइटमैप देखें" : "View Sitemap"}
          </Link>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[0.72fr_0.28fr]">
        <div className="space-y-5">
          {slug === "feedback" && <FeedbackForm />}
          {page.sections.map((section) => (
            <article
              key={section.heading}
              className="rsac-shine group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#0f6f42]/30 hover:shadow-[0_22px_56px_rgba(18,50,74,0.1)]"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#0f6f42] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-15"
              />
              <h2 className="relative z-[1] text-2xl font-extrabold text-[#102f46]">
                {section.heading}
              </h2>

              <p className="mt-4 leading-relaxed text-slate-700">{section.body}</p>

              {section.officers?.length > 0 && (
                <div className="relative z-[1] mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <div className="hidden bg-[#f7fbfe] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid sm:grid-cols-[1.3fr_1.4fr_1fr] sm:gap-4">
                    <span>{isHindi ? "नाम" : "Name"}</span>
                    <span>{isHindi ? "पद" : "Post"}</span>
                    <span>{isHindi ? "दूरभाष" : "Phone"}</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {section.officers.map((officer) => (
                      <div
                        key={`${officer.name}-${officer.post}`}
                        className="grid gap-1.5 px-4 py-3.5 transition hover:bg-[#f8fbfd] sm:grid-cols-[1.3fr_1.4fr_1fr] sm:items-center sm:gap-4"
                      >
                        <p className="flex items-center gap-2 font-extrabold text-[#102f46]">
                          <UserRoundCheck
                            className="h-4 w-4 shrink-0 text-[#0f6f42] sm:hidden"
                            aria-hidden="true"
                          />
                          {officer.name}
                        </p>
                        <p className="text-sm font-semibold text-[#0b6fa4]">
                          {officer.post}
                        </p>
                        {officer.phone && (
                          <a
                            href={`tel:${officer.phone.replace(/[^+\d]/g, "")}`}
                            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {officer.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section.documents?.length > 0 && (
                <div className="relative z-[1] mt-5 space-y-3">
                  {section.documents.map((doc) => (
                    <button
                      key={doc.title}
                      type="button"
                      onClick={() => openDocument({ url: doc.url, title: doc.title })}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-[#f7fbfe] px-4 py-3 text-left transition hover:border-[#0f6f42]/35 hover:bg-emerald-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f6f42]/10 text-[#0f6f42]">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold text-[#102f46]">
                          {doc.title}
                        </span>
                        {doc.meta && (
                          <span className="block text-xs font-semibold text-slate-500">
                            {doc.meta}
                          </span>
                        )}
                      </span>
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0f6f42] px-3 py-1.5 text-xs font-bold text-white">
                        {isHindi ? "देखें" : "View"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {section.address && (
                <p className="relative z-[1] mt-4 flex items-start gap-2 rounded-lg border border-emerald-900/10 bg-emerald-50/70 p-3 text-sm leading-relaxed text-slate-700">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#0f6f42]"
                    aria-hidden="true"
                  />
                  {section.address}
                </p>
              )}

              {section.externalUrl && (
                <a
                  href={section.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0f6f42] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b5f38]"
                >
                  {section.actionLabel ||
                    (isHindi ? "आधिकारिक सेवा खोलें" : "Open official service")}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(18,50,74,0.06)] lg:sticky lg:top-36">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6fa4]">
            {isHindi ? "जन सेवाएं" : "Public Services"}
          </p>

          <div className="mt-5 space-y-2">
            {publicInfoPages.map((item) => (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  item.slug === slug
                    ? "bg-emerald-50 text-[#0f6f42]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#102f46]"
                }`}
              >
                {item.title}
              </Link>
            ))}

            <Link
              to="/notices"
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#102f46]"
            >
              {isHindi ? "सूचनाएं एवं परिपत्र" : "Notices & Circulars"}
            </Link>

            <Link
              to="/flood-reports"
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#102f46]"
            >
              {isHindi ? "दैनिक बाढ़ रिपोर्ट" : "Flood Daily Reports"}
            </Link>
          </div>

          {page.links?.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="text-sm font-extrabold text-[#102f46]">
                {t("Related Links")}
              </h2>
              <div className="mt-3 space-y-2">
                {page.links.map((item) => {
                  const path = item.path || item.url || "";
                  const isExternal = /^https?:\/\//i.test(path);
                  const LinkIcon = isExternal ? ExternalLink : ArrowRight;
                  const className =
                    "flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-[#0b6fa4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]";
                  const content = (
                    <>
                      <span>{item.label || item.title || path}</span>
                      <LinkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </>
                  );

                  return isExternal ? (
                    <a
                      key={`${item.label || item.title}-${path}`}
                      href={path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={`${item.label || item.title}-${path}`}
                      to={path || "/"}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
};

export default PublicInfoPage;
