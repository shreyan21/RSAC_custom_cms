import { useEffect, useState } from "react";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import chiefMinisterFallback from "../../assets/images/cm.webp";
import primeMinisterFallback from "../../assets/images/pm.webp";

// Show the bundled portrait immediately, then swap to the CMS image only after
// it has fully decoded off-DOM. This stops the visible "old photo → new photo"
// blink when the Directus image (usually the same picture) replaces the bundled
// fallback on first load, and never shows a broken/half-loaded frame.
const LeaderPortrait = ({ leader, fallback }) => {
  const target = leader.image || fallback;
  const [src, setSrc] = useState(fallback);

  useEffect(() => {
    if (!target || target === fallback) {
      setSrc(target || fallback);
      return undefined;
    }

    let active = true;
    const preloader = new Image();
    preloader.onload = () => {
      if (active) setSrc(target);
    };
    preloader.onerror = () => {
      if (active) setSrc(fallback);
    };
    preloader.src = target;

    return () => {
      active = false;
    };
  }, [target, fallback]);

  return (
    <img
      src={src}
      alt={leader.alt || leader.name}
      className="hero-leader-image rsac-circular-portrait__image"
      style={{ objectPosition: leader.objectPosition || "center" }}
      draggable="false"
      decoding="async"
    />
  );
};

const HeroLeaderPortraits = ({ className = "" }) => {
  const { hero } = useSiteSettings();
  const { t } = useLanguage();
  const portraitFallbacks = [primeMinisterFallback, chiefMinisterFallback];

  return (
    <div
      className={`hero-watermark-portraits relative flex items-center gap-0 ${className}`}
      aria-label={t(
        "Prime Minister Narendra Modi and Chief Minister Yogi Adityanath"
      )}
    >
      {hero.leaders.map((leader, index) => (
        <figure
          key={leader.name}
          className="hero-leader-figure relative z-10 m-0 flex items-center"
        >
          <div
            className={`hero-watermark-portrait ${
              index === 0
                ? "hero-watermark-portrait--pm"
                : "hero-watermark-portrait--cm"
            } rsac-circular-portrait relative border-white`}
          >
            <LeaderPortrait
              leader={leader}
              fallback={portraitFallbacks[index]}
            />
          </div>

          <figcaption className="sr-only">
            {leader.name}, {leader.role}
          </figcaption>
        </figure>
      ))}
    </div>
  );
};

export default HeroLeaderPortraits;
