import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../hooks/useLanguage";
import useModalFocus from "../../hooks/useModalFocus";

const validIndex = (index, count) => Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), Math.max(count - 1, 0));

// Full-screen image viewer with prev/next + keyboard control.
// images: [{ src, caption }]. startIndex: which one opens first.
const Lightbox = ({ images = [], startIndex = 0, onClose }) => {
  const { t } = useLanguage();
  const [index, setIndex] = useState(() => validIndex(startIndex, images.length));
  const count = images.length;
  const currentIndex = validIndex(index, count);
  const dialogRef = useModalFocus({ isOpen: count > 0, onClose });

  const go = useCallback(
    (delta) => { if (count) setIndex((i) => (validIndex(i, count) + delta + count) % count); },
    [count]
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    if (!count) return undefined;
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [go, count]);

  if (!count) return null;
  const current = images[currentIndex] || {};

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t("Image viewer")}
      data-lenis-prevent
      className="fixed inset-0 z-[200] flex flex-col bg-[#041220]/94 backdrop-blur-md"
      onClick={onClose}
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
        <span className="text-sm font-bold tabular-nums text-white/80">
          {currentIndex + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close")}
          className="grid h-11 w-11 place-items-center rounded-lg border border-white/20 text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
        {count > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={t("Previous")}
            className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:left-5"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
        )}

        <figure
          className="flex min-h-0 max-h-full max-w-5xl flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={current.src}
            alt={current.caption || ""}
            className="min-h-0 max-h-[78vh] w-auto max-w-full rounded-lg object-contain shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          />
          {current.caption && (
            <figcaption className="mt-4 max-h-[20dvh] max-w-2xl shrink-0 overflow-y-auto overscroll-contain text-center text-sm leading-relaxed text-white/80">
              {current.caption}
            </figcaption>
          )}
        </figure>

        {count > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={t("Next")}
            className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 sm:right-5"
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Lightbox;
