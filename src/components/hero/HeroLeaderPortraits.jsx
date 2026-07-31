import { useEffect, useState } from "react";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const getProfileImage = (profile) =>
  profile?.photo || profile?.image || profile?.portrait || "";

const LeaderPortrait = ({ leader, index }) => {
  const target = getProfileImage(leader);
  const [loaded, setLoaded] = useState({ target: "", src: "" });

  useEffect(() => {
    if (!target) return undefined;

    let active = true;
    const preloader = new Image();
    preloader.onload = () => {
      if (active) setLoaded({ target, src: target });
    };
    preloader.onerror = () => {
      if (active) setLoaded({ target, src: "" });
    };
    preloader.src = target;

    return () => {
      active = false;
    };
  }, [target]);

  const src = loaded.target === target ? loaded.src : "";
  if (!src) return null;

  return (
    <figure className="hero-leader-figure relative z-10 m-0 flex items-center">
      <div
        className={`hero-watermark-portrait ${
          index === 0
            ? "hero-watermark-portrait--pm"
            : "hero-watermark-portrait--cm"
        } rsac-circular-portrait relative border-white`}
      >
        <img
          src={src}
          alt={leader.alt || leader.name}
          className="hero-leader-image rsac-circular-portrait__image"
          style={{ objectPosition: leader.objectPosition || "center" }}
          draggable="false"
          decoding="async"
        />
      </div>

      <figcaption className="sr-only">
        {leader.name}, {leader.role}
      </figcaption>
    </figure>
  );
};

const HeroLeaderPortraits = ({ className = "" }) => {
  const { hero } = useSiteSettings();
  const { t } = useLanguage();
  const leaders = hero.leaders || [];

  return (
    <div
      className={`hero-watermark-portraits relative flex items-center gap-0 ${className}`}
      aria-label={t(
        "Prime Minister Narendra Modi and Chief Minister Yogi Adityanath"
      )}
    >
      {leaders.map((leader, index) => (
        <LeaderPortrait
          key={leader.id || leader.name || index}
          leader={leader}
          index={index}
        />
      ))}
    </div>
  );
};

export default HeroLeaderPortraits;
