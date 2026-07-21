import { Download, FileText } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useDownloads, useSiteSettings } from "../../hooks/useData";
import { useDialog } from "../../hooks/useDialog";

const DownloadsPage = () => {
  const downloads = useDownloads();
  const { pageContent } = useSiteSettings();
  const { openDocument } = useDialog();
  const content = pageContent?.downloads || {};

  return (
    <PageShell
      eyebrow={content.eyebrow}
      title={content.title}
      intro={content.intro}
      actions={<BackButton fallback="/" label={content.backLabel} />}
    >
      {downloads.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {downloads.map((item) => (
            <article
              key={item.id || item.key}
              className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(18,50,74,0.06)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#0f6f42]">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  {item.category && (
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0b6fa4]">
                      {item.category}
                    </p>
                  )}
                  <h2 className="break-words text-lg font-extrabold leading-snug text-[#102f46]">
                    {item.title}
                  </h2>
                </div>
              </div>

              {item.summary && (
                <p className="mt-4 break-words text-sm leading-7 text-slate-600">
                  {item.summary}
                </p>
              )}
              {item.date && (
                <p className="mt-3 text-sm font-semibold text-slate-500">{item.date}</p>
              )}

              {item.url && (
                <button
                  type="button"
                  onClick={() => openDocument({ url: item.url, title: item.title })}
                  className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {content.openLabel}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-600">
          {content.emptyText}
        </p>
      )}
    </PageShell>
  );
};

export default DownloadsPage;
