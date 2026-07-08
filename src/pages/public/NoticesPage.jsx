import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useNotices, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { useDialog } from "../../hooks/useDialog";

const localizeNoticeMeta = (meta, t, isHindi) => {
  if (!meta || !isHindi) {
    return meta;
  }

  return String(meta)
    .replace(/\bSize:/g, t("Size:"))
    .replace(/\bLanguage:/g, t("Language:"))
    .replace(/\bEnglish\b/g, t("English"));
};

const NoticesPage = () => {
  const notices = useNotices();
  const { pageContent } = useSiteSettings();
  const { t, isHindi } = useLanguage();
  const { openDocument } = useDialog();
  const c = pageContent.notices;
  const col = c.columns;
  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      actions={<BackButton fallback="/" label={c.backLabel} />}
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
        <div className="hidden border-b border-slate-200 bg-[#f8fbfd] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:grid md:grid-cols-[4.5rem_7.5rem_1fr_8rem] md:gap-4">
          <span>{col.serial}</span>
          <span>{col.category}</span>
          <span>{col.notice}</span>
          <span>{col.action}</span>
        </div>

        <div className="divide-y divide-slate-200">
          {notices.map((notice, index) => (
            <article
              key={notice.id}
              className="group relative grid gap-4 px-5 py-5 transition hover:bg-[#f8fbfd] md:grid-cols-[4.5rem_7.5rem_1fr_8rem] md:items-start md:gap-4"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[#0f6f42] transition-transform duration-500 group-hover:scale-y-100"
              />
              <p className="text-sm font-extrabold text-[#0f6f42]">
                {String(index + 1).padStart(2, "0")}
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0b6fa4]">
                {t(notice.type || notice.category)}
              </p>

              <div>
                <h2 className="text-lg font-extrabold leading-snug text-[#102f46]">
                  {notice.title}
                </h2>

                {notice.meta && (
                  <p className="mt-2 text-sm text-slate-600">
                    {localizeNoticeMeta(notice.meta, t, isHindi)}
                  </p>
                )}

                {notice.lastDate && (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {t("Last Date")}: {notice.lastDate}
                  </p>
                )}
              </div>

              <div className="md:text-right">
                {notice.url || notice.pdfUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      openDocument({
                        url: notice.url || notice.pdfUrl,
                        title: notice.title,
                      })
                    }
                    aria-label={`${notice.title} ${t("PDF")}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0b6fa4]/20 bg-[#0b6fa4]/8 px-3 py-2 text-sm font-bold text-[#0b6fa4] transition hover:bg-[#0b6fa4]/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    {t("PDF")}
                  </button>
                ) : (
                  <Link
                    to="/contact"
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-[#0f6f42]/25 hover:text-[#0f6f42]"
                  >
                    {t("Contact")}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default NoticesPage;
