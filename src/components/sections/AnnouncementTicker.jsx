import { ArrowUpRight, Megaphone, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotices } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const TickerItem = ({ notice, duplicate = false, t }) => {
  const isExternal = Boolean(notice.url || notice.pdfUrl);
  const href = notice.url || notice.pdfUrl;
  const className =
    "group inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-[#102f46] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]";

  const inner = (
    <>
      <span className="rounded-full bg-[#0b6fa4]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0b6fa4]">
        {t(notice.type || notice.category || "Update")}
      </span>
      <span>{t(notice.title)}</span>
      <ArrowUpRight
        className="h-3.5 w-3.5 shrink-0 text-[#0f6f42] transition group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  );

  // The duplicated set exists only to make the marquee loop seamlessly. It must
  // not be focusable or announced — render as an inert visual copy.
  if (duplicate) {
    return (
      <span className={className} aria-hidden="true">
        {inner}
      </span>
    );
  }

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link to="/notices" className={className}>
      {inner}
    </Link>
  );
};

const AnnouncementTicker = () => {
  const notices = useNotices();
  const { t } = useLanguage();
  const items = (notices || []).slice(0, 8).filter((n) => n && n.title);

  if (!items.length) {
    return null;
  }

  return (
    <aside
      aria-label={t("Latest announcements")}
      className="rsac-ticker-band relative z-[15] border-y border-emerald-900/10 bg-[linear-gradient(100deg,#eaf7ef_0%,#f3fbf6_45%,#eef6fb_100%)]"
    >
      <div className="mx-auto flex max-w-[120rem] items-stretch">
        {/* Fixed label */}
        <div className="geo-btn-saffron relative z-[2] flex shrink-0 items-center gap-2 px-4 py-3 text-white sm:px-5">
          <Megaphone className="rsac-ticker-bell h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-extrabold uppercase tracking-[0.16em]">
            {t("What's New")}
          </span>
          <Sparkles className="hidden h-3.5 w-3.5 text-amber-300 sm:inline" aria-hidden="true" />
        </div>

        {/* Scrolling track */}
        <div className="rsac-ticker relative min-w-0 flex-1 overflow-hidden">
          <div className="rsac-ticker-track flex items-center py-2">
            {items.map((notice) => (
              <TickerItem key={`a-${notice.id}`} notice={notice} t={t} />
            ))}
            {/* Duplicate for seamless loop; hidden from assistive tech. */}
            {items.map((notice) => (
              <TickerItem key={`b-${notice.id}`} notice={notice} duplicate t={t} />
            ))}
          </div>
        </div>

        {/* View-all */}
        <Link
          to="/notices"
          className="hidden shrink-0 items-center gap-1.5 border-l border-emerald-900/10 px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#0f6f42] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] sm:inline-flex"
        >
          {t("View all")}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
};

export default AnnouncementTicker;
