import { useEffect, useState } from "react";
import { useOfficials, useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import chiefMinisterFallback from "../../assets/images/cm.webp";
import primeMinisterFallback from "../../assets/images/pm.webp";

const getProfileImage = (profile) =>
  profile?.photo || profile?.image || profile?.portrait || "";

const normalizePersonName = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/^(?:hon'?ble\s+|shri\s+|sri\s+|smt\.?\s+|dr\.?\s+|\u0936\u094d\u0930\u0940\s+|\u0936\u094d\u0930\u0940\u092e\u0924\u0940\s+|\u0921\u0949\.?\s+)/iu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const isChiefMinister = (value) =>
  /chief\s*minister|\u092e\u0941\u0916\u094d\u092f\u092e\u0902\u0924\u094d\u0930\u0940/iu.test(String(value || ""));

// Show the bundled portrait immediately, then swap to the CMS image only after
// it has fully decoded off-DOM. This stops the visible "old photo → new photo"
// blink when the CMS image (usually the same picture) replaces the bundled
// fallback on first load, and never shows a broken/half-loaded frame.
const LeaderPortrait = ({ leader, fallback }) => {
  const target = leader.image || fallback;
  const [src, setSrc] = useState(fallback);

  useEffect(() => {
    if (!target || target === fallback) {
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
  const visibleSrc = !target || target === fallback ? target || fallback : src;

  return (
    <img
      src={visibleSrc}
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
  const officials = useOfficials();
  const { t } = useLanguage();
  const portraitFallbacks = [primeMinisterFallback, chiefMinisterFallback];
  const leaders = (hero.leaders || []).map((leader) => {
    const leaderName = normalizePersonName(leader.name);
    const official = officials.find((profile) =>
      normalizePersonName(profile.name) === leaderName ||
      (
        isChiefMinister(`${leader.role || ""} ${leader.alt || ""}`) &&
        isChiefMinister(`${profile.role || ""} ${profile.designation || ""}`)
      )
    );
    const image = getProfileImage(official);

    return image
      ? {
          ...leader,
          image,
          objectPosition: official.objectPosition || leader.objectPosition,
        }
      : leader;
  });

  return (
    <div
      className={`hero-watermark-portraits relative flex items-center gap-0 ${className}`}
      aria-label={t(
        "Prime Minister Narendra Modi and Chief Minister Yogi Adityanath"
      )}
    >
      {leaders.map((leader, index) => (
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
