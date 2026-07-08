import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveHeroVideo } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import HeroLeaderPortraits from "./HeroLeaderPortraits";
import { activeHeroVideo as bundledHeroVideo } from "../../data/heroVideos";
// Bundled poster = the video's exact first frame. We always use it (even when
// the CMS supplies its own poster, which is a zoomed-UP still that does NOT
// match the video's wide opening frame → caused the load "blink"/morph).
import heroFrameZeroPoster from "../../assets/images/hero-videos/rsac-earth-studio-up-poster.jpg";

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia(reduceMotionQuery).matches;

const shouldLoadHeroVideo = () =>
  typeof window !== "undefined" &&
  !navigator.connection?.saveData;

// Large or high-DPI screens stretch the 1280px master well past its native
// size; serve the sharper 1920px encode there. Desktop-width layouts only —
// phones can hit 1600 device pixels via devicePixelRatio alone, but their
// small physical screens hide the softness and the bigger file would punish
// mobile data. Decided once at mount so a window resize never swaps src
// mid-playback (that would restart the video).
const prefersLargeHeroSource = () =>
  typeof window !== "undefined" &&
  (window.innerWidth || 0) >= 1280 &&
  (window.innerWidth || 0) * (window.devicePixelRatio || 1) >= 1600;

const HeroBackground = () => {
  const { t } = useLanguage();
  const activeHeroVideo = useActiveHeroVideo() || {};
  // Force the frame-0 poster so poster === video's first frame (seamless, no blink).
  const heroPoster = heroFrameZeroPoster;
  // A CMS row matching the bundled file resolves to bundledHeroVideo.video
  // (small master); upgrade that to the large encode on big screens. Custom
  // CMS uploads (different URL) are always used as-is.
  const [useLargeSource] = useState(prefersLargeHeroSource);
  const bundledVideo =
    useLargeSource && bundledHeroVideo.videoLarge
      ? bundledHeroVideo.videoLarge
      : bundledHeroVideo.video;
  const requestedVideoRaw = activeHeroVideo.video || bundledHeroVideo.video || "";
  const requestedVideo =
    requestedVideoRaw === bundledHeroVideo.video ? bundledVideo : requestedVideoRaw;
  const fallbackVideo =
    requestedVideo && requestedVideo !== bundledHeroVideo.video
      ? bundledHeroVideo.video
      : "";
  const videoRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);
  const [loadHeroVideo, setLoadHeroVideo] = useState(shouldLoadHeroVideo);
  const [failedVideos, setFailedVideos] = useState([]);
  const heroVideo = [requestedVideo, fallbackVideo].find(
    (source) => source && !failedVideos.includes(source)
  ) || "";
  const [isPaused, setIsPaused] = useState(false);
  const [pauseRequested, setPauseRequested] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const menuOpenRef = useRef(false);
  const heroVisibleRef = useRef(true);
  const documentVisibleRef = useRef(
    typeof document === "undefined" || !document.hidden
  );

  const playHeroVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video || reduceMotion || !heroVideo) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();

    if (playPromise) {
      playPromise
        .then(() => {
          setIsPaused(false);
        })
        .catch(() => {
          setIsPaused(true);
        });
      return;
    }

    setIsPaused(false);
  }, [heroVideo, reduceMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(reduceMotionQuery);

    const handleChange = (event) => {
      setReduceMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setLoadHeroVideo(shouldLoadHeroVideo());
    };

    const connection = navigator.connection;
    handleChange();
    connection?.addEventListener?.("change", handleChange);

    return () => {
      connection?.removeEventListener?.("change", handleChange);
    };
  }, []);

  const syncHeroPlayback = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (
      reduceMotion ||
      !loadHeroVideo ||
      pauseRequested ||
      menuOpenRef.current ||
      !heroVisibleRef.current ||
      !documentVisibleRef.current
    ) {
      video.pause();
      return;
    }

    playHeroVideo();
  }, [loadHeroVideo, pauseRequested, playHeroVideo, reduceMotion]);

  // The browser can pause the video on its own (power-saving, decoder stall,
  // autoplay-policy interrupt, background tab). Those pauses fire no tracked
  // event, so playback stayed dead until the user scrolled (which re-ran the
  // IntersectionObserver → syncHeroPlayback). Listen to the video's own pause
  // and resume immediately whenever we did not ask for it.
  const handleVideoPause = useCallback(() => {
    if (
      reduceMotion ||
      !loadHeroVideo ||
      pauseRequested ||
      menuOpenRef.current ||
      !heroVisibleRef.current ||
      !documentVisibleRef.current
    ) {
      return;
    }

    playHeroVideo();
  }, [loadHeroVideo, pauseRequested, playHeroVideo, reduceMotion]);

  useEffect(() => {
    syncHeroPlayback();
  }, [heroVideo, syncHeroPlayback]);

  useEffect(() => {
    if (
      !loadHeroVideo ||
      reduceMotion ||
      !fallbackVideo ||
      heroVideo !== requestedVideo
    ) {
      return undefined;
    }

    const startupTimer = window.setTimeout(() => {
      const video = videoRef.current;
      const playbackWasIntentionallyStopped =
        pauseRequested ||
        menuOpenRef.current ||
        !heroVisibleRef.current ||
        !documentVisibleRef.current;

      if (
        video &&
        !playbackWasIntentionallyStopped &&
        (video.readyState < 2 || video.currentTime < 0.2)
      ) {
        setFailedVideos((current) =>
          current.includes(requestedVideo)
            ? current
            : [...current, requestedVideo]
        );
        setVideoReady(false);
      }
    }, 6000);

    return () => window.clearTimeout(startupTimer);
  }, [
    fallbackVideo,
    heroVideo,
    loadHeroVideo,
    pauseRequested,
    reduceMotion,
    requestedVideo,
  ]);

  // Browsers may reject or suspend autoplay during navigation, tab restore,
  // decoder pressure, or a temporary offline state. A later user interaction,
  // pageshow, or network recovery is a safe opportunity to resume muted video.
  useEffect(() => {
    const resumeIfNeeded = () => {
      const video = videoRef.current;
      if (video?.paused) {
        syncHeroPlayback();
      }
    };

    window.addEventListener("pointerdown", resumeIfNeeded, { passive: true });
    window.addEventListener("pageshow", resumeIfNeeded);
    window.addEventListener("online", resumeIfNeeded);

    return () => {
      window.removeEventListener("pointerdown", resumeIfNeeded);
      window.removeEventListener("pageshow", resumeIfNeeded);
      window.removeEventListener("online", resumeIfNeeded);
    };
  }, [syncHeroPlayback]);

  // On remount (e.g. navigating back to home) a cached video is already
  // decoded, so onLoadedData/onCanPlay never refire and videoReady stayed
  // false → playback control vanished and sync never ran. Seed readiness from
  // the element's own readyState instead of waiting for an event.
  useEffect(() => {
    const video = videoRef.current;

    if (!video || reduceMotion || !loadHeroVideo || !heroVideo) {
      return;
    }

    if (video.readyState >= 2) {
      setVideoReady(true);
      syncHeroPlayback();
    }
  }, [heroVideo, loadHeroVideo, reduceMotion, syncHeroPlayback]);

  useEffect(() => {
    const handleMenuVisibility = (event) => {
      menuOpenRef.current = Boolean(event.detail?.open);
      syncHeroPlayback();
    };

    const handleDocumentVisibility = () => {
      documentVisibleRef.current = !document.hidden;
      syncHeroPlayback();
    };

    window.addEventListener("rsac:menu-visibility", handleMenuVisibility);
    document.addEventListener("visibilitychange", handleDocumentVisibility);

    return () => {
      window.removeEventListener("rsac:menu-visibility", handleMenuVisibility);
      document.removeEventListener("visibilitychange", handleDocumentVisibility);
    };
  }, [syncHeroPlayback]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        heroVisibleRef.current = entry.intersectionRatio >= 0.55;
        syncHeroPlayback();
      },
      { threshold: [0, 0.55] }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [heroVideo, syncHeroPlayback]);

  const handleVideoError = () => {
    setFailedVideos((current) =>
      current.includes(heroVideo) ? current : [...current, heroVideo]
    );
    setVideoReady(false);
  };

  const handleTogglePlayback = () => {
    if (isPaused) {
      setPauseRequested(false);
      playHeroVideo();
      return;
    }

    setIsPaused(true);
    setPauseRequested(true);
  };

  const showPlaybackControl = loadHeroVideo && !reduceMotion && videoReady;
  const playbackLabel = isPaused
    ? t("Play hero background video")
    : t("Pause hero background video");

  return (
    <>
      <div
        className="absolute inset-0 overflow-hidden bg-[#040b16]"
        aria-hidden="true"
      >

       <div className="absolute inset-0">
        <img
          src={heroPoster}
          alt=""
          className="hero-map-media hero-map-poster"
          fetchPriority="high"
        />

        {loadHeroVideo && !reduceMotion && heroVideo && (

          /* GOOGLE EARTH STUDIO VIDEO, WITH GENERATED LOCAL FALLBACK */
          <video
            ref={videoRef}
            key={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={heroPoster}
            disablePictureInPicture
            tabIndex={-1}
            onLoadStart={() => {
              setVideoReady(false);
              setPauseRequested(false);
              setIsPaused(false);
            }}
            onLoadedData={() => {
              // First frame decoded at t=0 — matches the poster exactly, so the
              // poster→video crossfade is seamless (no mid-playback ghost/blink).
              setVideoReady(true);
              syncHeroPlayback();
            }}
            onCanPlay={() => {
              setVideoReady(true);
              syncHeroPlayback();
            }}
            onStalled={syncHeroPlayback}
            onEnded={syncHeroPlayback}
            onPlaying={() => {
              // Fires on every real (re)start, including a cached resume that
              // emits no load events — keeps the control visible and state true.
              setVideoReady(true);
              setIsPaused(false);
            }}
            onError={handleVideoError}
            onPause={handleVideoPause}
            className={`hero-map-media hero-map-video ${
              videoReady ? "is-ready" : ""
            }`}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>

        )}
       </div>

        {/* CINEMATIC READABILITY SCRIM — left-weighted so the right-hand Earth
            stays vivid; text column sits over the dark side (WCAG-AA safe). */}
        <div className="hero-readability-horizontal absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(3,9,20,0.93)_0%,rgba(3,9,20,0.8)_30%,rgba(3,9,20,0.4)_52%,rgba(3,9,20,0.08)_74%,rgba(3,9,20,0)_100%)]" />
        <div className="hero-readability-vertical absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(3,9,20,0.5)_0%,rgba(3,9,20,0)_24%,rgba(3,9,20,0)_64%,rgba(3,9,20,0.55)_100%)]" />
        {/* Teal earth-observation glow (right) + warm saffron glow (left, behind
            text) + amber accent — deep-blue / teal / green / amber palette. */}
        <div className="absolute inset-0 z-[2] bg-[radial-gradient(55%_62%_at_80%_36%,rgba(13,148,136,0.13)_0%,transparent_72%)]" />
        <div className="absolute inset-0 z-[2] bg-[radial-gradient(58%_55%_at_16%_30%,rgba(249,115,22,0.1)_0%,transparent_68%)]" />
        {/* Cinematic edge vignette — focuses the eye on the Earth */}
        <div className="absolute inset-0 z-[3] bg-[radial-gradient(125%_125%_at_50%_44%,transparent_56%,rgba(2,6,14,0.34)_100%)]" />
        {/* Static film grain: dithers gradient banding in the dark scrims and
            masks upscale softness on large screens. One composited layer, no
            animation — zero per-frame cost. */}
        <div className="hero-grain-overlay absolute inset-0 z-[3]" />
        {/* Fine teal graticule (geospatial grid) */}
        <div className="absolute inset-0 z-[3] opacity-[0.05] bg-[linear-gradient(to_right,#2dd4bf_1px,transparent_1px),linear-gradient(to_bottom,#2dd4bf_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,white,transparent_82%)]" />
        {/* BOTTOM FADE INTO NEXT SECTION */}
        <div className="hero-bottom-fade absolute inset-x-0 bottom-0 z-[4] h-44" />

      </div>

      {/* WATERMARK COVER WITH LEADERSHIP PORTRAITS */}
      <div
        className="hero-watermark-cover pointer-events-none absolute z-30 hidden flex-col items-end md:flex"
        aria-label={t("Prime Minister and Chief Minister portraits")}
      >
        <HeroLeaderPortraits />
      </div>

      {showPlaybackControl && (
        <button
          type="button"
          aria-label={playbackLabel}
          aria-pressed={isPaused}
          title={playbackLabel}
          onClick={handleTogglePlayback}
          className="absolute bottom-6 left-5 z-30 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-900/15 bg-white/92 text-emerald-900 shadow-[0_12px_34px_rgba(18,50,74,0.13)] transition duration-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-900 sm:bottom-8 sm:left-8"
        >
          {isPaused ? (
            <Play className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Pause className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      )}
    </>
  );
};

export default HeroBackground;
