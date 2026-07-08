import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { useGalleryItems, useSiteSettings } from "../../hooks/useData";
import MaskReveal from "../motion/MaskReveal";
import { gallerySection } from "../../data/gallery";

const HomeGalleryPreview = () => {
  const { isHindi, t } = useLanguage();
  const galleryImages = useGalleryItems();
  const { pageContent } = useSiteSettings();
  const shouldReduceMotion = useReducedMotion();
  const preview = galleryImages.slice(0, 8);
  const g = pageContent?.gallery || {
    eyebrow: isHindi ? gallerySection.eyebrowHi : gallerySection.eyebrow,
    title: isHindi ? gallerySection.titleHi : gallerySection.title,
    actionLabel: isHindi ? "सभी तस्वीरें देखें" : "View all photos",
    imageAlt: isHindi ? "गैलरी चित्र" : "Gallery image",
  };

  if (!preview.length) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-gallery-title"
      className="relative overflow-hidden bg-[#071b2e] px-5 py-20 sm:px-8 sm:py-24 md:px-12 lg:px-20"
    >
      <div className="rsac-geo-mesh rsac-geo-mesh--dark" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0_33.33%,#ffffff_33.33%_66.66%,#138808_66.66%_100%)]"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.65 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-200/80">
              {g.eyebrow}
            </p>
            <MaskReveal
              as="h2"
              id="home-gallery-title"
              className="rsac-display mt-3 text-[1.9rem] font-[800] leading-[1.08] tracking-[-0.018em] text-white md:text-[2.8rem]"
            >
              {g.title}
            </MaskReveal>
          </div>

          <Link
            to="/gallery"
            className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-orange-200 px-4 py-2.5 text-sm font-extrabold text-[#071b2e] transition duration-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
          >
            <Images className="h-4 w-4" aria-hidden="true" />
            {g.actionLabel || t("View all photos")}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </motion.div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {preview.map((image) => (
            <li key={image.id}>
              <Link
                to="/gallery"
                className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-orange-200"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt || image.caption || g.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HomeGalleryPreview;
