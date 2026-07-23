import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveCmsIcon } from "../components/icons/cmsIconRegistry";
import { useSiteSettings } from "../hooks/useData";
import { useLanguage } from "../hooks/useLanguage";

const PlaceholderPage = ({ title }) => {
  const { t } = useLanguage();
  const { pageContent } = useSiteSettings();
  const c = pageContent.placeholder;
  const pageTitle = title || c.title;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#041220] px-6 py-32 text-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#fb923c_1px,transparent_1px),linear-gradient(to_bottom,#fb923c_1px,transparent_1px)] bg-[size:72px_72px]"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/8 blur-[160px]"
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-200/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-100">
          <Compass className="h-4 w-4" aria-hidden="true" />
          {t(c.eyebrow)}
        </p>

        <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
          {t(pageTitle)}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-orange-50/65">
          {t(c.body)}
        </p>

        <ul className="mx-auto mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
          {c.links.map(({ label, path, icon }) => {
            const Icon = resolveCmsIcon(icon, resolveCmsIcon("compass"));
            return (
            <li key={path}>
              <Link
                to={path}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition duration-300 hover:border-orange-200/40 hover:bg-white/[0.09] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-orange-200" aria-hidden="true" />
                  {t(label)}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-orange-200"
                  aria-hidden="true"
                />
              </Link>
            </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
};

export default PlaceholderPage;
