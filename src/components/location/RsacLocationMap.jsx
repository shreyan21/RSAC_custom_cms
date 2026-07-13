import { ExternalLink, MapPinned, Navigation } from "lucide-react";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const cardEyebrowSizeClasses = {
  small: "text-xs",
  normal: "text-sm",
  large: "text-lg sm:text-xl",
};

const RsacLocationMap = ({ compact = false }) => {
  const { location } = useSiteSettings();
  const { t } = useLanguage();
  const hasText =
    location.cardEyebrow ||
    location.locality ||
    location.address ||
    location.directionsLabel;
  const hasMap = Boolean(location.mapQuery);

  if (!hasText && !hasMap) {
    return null;
  }

  const encodedMapQuery = encodeURIComponent(location.mapQuery || "");

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_54px_rgba(18,50,74,0.09)] ${
        compact ? "" : "lg:grid lg:grid-cols-[0.72fr_1.28fr]"
      }`}
    >
    {hasText && (
    <div className="flex flex-col justify-center p-5 sm:p-6">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-[#0f6f42]">
        <MapPinned className="h-5 w-5" aria-hidden="true" />
      </span>

      {location.cardEyebrow && (
        <p className={`mt-5 font-bold uppercase tracking-[0.12em] text-[#0b6fa4] ${
          cardEyebrowSizeClasses[location.cardEyebrowSize]
            || cardEyebrowSizeClasses.normal
        }`}>
          {location.cardEyebrow}
        </p>
      )}
      {location.locality && (
        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#102f46]">
          {location.locality}
        </h2>
      )}
      {location.address && (
        <address className="mt-3 not-italic text-sm leading-relaxed text-slate-600">
          {location.address}
        </address>
      )}

      {location.mapQuery && location.directionsLabel && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-[#0f6f42] px-3.5 py-2 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0f6f42]"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          {location.directionsLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
    )}

    {hasMap && (
    <div className={`relative bg-[#eaf3f7] ${compact ? "h-72" : "min-h-80"}`}>
      <iframe
        title={t(
          "Map showing the location of Remote Sensing Applications Centre, Uttar Pradesh"
        )}
        src={`https://www.google.com/maps?q=${encodedMapQuery}&output=embed`}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
    )}
    </div>
  );
};

export default RsacLocationMap;
