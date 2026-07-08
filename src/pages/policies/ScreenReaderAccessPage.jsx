import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const ScreenReaderAccessPage = () => {
  const { accessibility, pageContent } = useSiteSettings();
  const { t } = useLanguage();
  const screenReaders = accessibility.screenReaders;
  const c = pageContent.screenReader;

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      actions={<BackButton fallback="/" label={c.backLabel} />}
    >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_38px_rgba(18,50,74,0.055)]">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-extrabold text-[#102f46]">
            {t("Download a screen reader")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {t(
              "Install one of these programs to have any website, document, or menu read aloud by your computer."
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <caption className="sr-only">
              {t("Screen reader software list")}
            </caption>
            <thead className="bg-[#f4f9fc] text-[#102f46]">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 font-extrabold">
                  {t("Screen Reader")}
                </th>
                <th className="border-b border-slate-200 px-4 py-3 font-extrabold">
                  {t("Website")}
                </th>
                <th className="border-b border-slate-200 px-4 py-3 font-extrabold">
                  {t("Type")}
                </th>
              </tr>
            </thead>
            <tbody>
              {screenReaders.map((reader) => (
                <tr
                  key={reader.name}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-3 font-bold text-[#102f46]">
                    {reader.name}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={reader.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#0b6fa4] underline underline-offset-4"
                    >
                      {reader.website}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{t(reader.type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
};

export default ScreenReaderAccessPage;
