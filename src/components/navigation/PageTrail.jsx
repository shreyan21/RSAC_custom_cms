import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { SHOW_BREADCRUMBS } from "../../config/uiConfig";

const PageTrail = ({ items = [], className = "" }) => {
  const { t } = useLanguage();
  const visibleItems = items.filter(Boolean);

  // Breadcrumbs are hidden site-wide via a single flag; flip SHOW_BREADCRUMBS in
  // src/config/uiConfig.js to bring them back. Callers keep passing `items`.
  if (!SHOW_BREADCRUMBS || !visibleItems.length) {
    return null;
  }

  return (
    <nav
      aria-label={t("Breadcrumb")}
      className={`mb-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600 ${className}`}
    >
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const content = (
          <>
            {index === 0 && item.to === "/" && (
              <Home className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{t(item.label)}</span>
          </>
        );

        return (
          <span key={`${item.label}-${item.to || index}`} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            )}

            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1 text-slate-600 transition hover:bg-emerald-50 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
              >
                {content}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1 text-[#102f46]"
              >
                {content}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default PageTrail;
