import { ImageOff } from "lucide-react";
import { useState } from "react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import Lightbox from "../../components/media/Lightbox";
import { useGalleryItems, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const GalleryPage = () => {
  const { t } = useLanguage();
  const galleryImages = useGalleryItems();
  const { pageContent } = useSiteSettings();
  const [activeIndex, setActiveIndex] = useState(null);
  const g = pageContent?.gallery || {};

  const lightboxImages = galleryImages.map((image) => ({
    src: image.src,
    caption: image.caption,
  }));

  return (
    <PageShell
      eyebrow={g.eyebrow}
      title={g.title}
      intro={g.intro}
      breadcrumbs={[
        { label: t("Home"), to: "/" },
        { label: g.eyebrow },
      ]}
      actions={
        <BackButton
          fallback="/"
          label={g.backLabel}
        />
      }
    >
      {galleryImages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ImageOff className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-base font-semibold text-slate-600">
            {g.emptyText}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {galleryImages.map((image, i) => {
            const caption = image.caption;

            return (
              <li key={image.id} className="rsac-cv-gallery">
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="rsac-gallery-frame group block w-full bg-white text-left transition duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  <span className="rsac-gallery-frame__media block aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={image.src}
                      alt={image.alt || caption || g.imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </span>
                  {caption && (
                    <span className="rsac-gallery-frame__caption block px-2 pb-1 pt-3 text-sm font-semibold leading-relaxed text-[#102f46]">
                      {caption}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeIndex !== null && (
        <Lightbox
          images={lightboxImages}
          startIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </PageShell>
  );
};

export default GalleryPage;
