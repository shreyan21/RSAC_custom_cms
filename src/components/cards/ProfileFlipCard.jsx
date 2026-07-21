import { Mail, Phone, UserRound } from "lucide-react";
import { handleNestedWheel } from "../../utils/nestedScroll";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

const getProfileName = (profile) =>
  profile.name || profile.title?.rendered || profile.title || profile.acf?.name || "Profile";

const getImageUrl = (image) => {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return (
    image.url ||
    image.source_url ||
    image.media_details?.sizes?.medium?.source_url ||
    image.media_details?.sizes?.thumbnail?.source_url ||
    ""
  );
};

const getProfileImage = (profile) =>
  getImageUrl(
    profile.photo ||
      profile.image ||
      profile.featured_image ||
      profile.acf?.image ||
      profile.acf?.photo ||
      profile._embedded?.["wp:featuredmedia"]?.[0]
  );

const isScientistCard = (profile) => {
  const type = String(profile.profileType || "").toLowerCase();
  if (["scientist", "former", "former-scientist", "former_scientist"].includes(type)) {
    return true;
  }

  return /\bscientist\b/i.test(
    `${profile.designation || ""} ${profile.role || ""} ${profile.category || ""}`
  );
};

const localizeProfileValue = (value, t) =>
  value === null || value === undefined ? "" : t(String(value));

const renderDetail = (detail, t, isHindi) =>
  typeof detail === "string"
    ? localizeProfileValue(detail, t, isHindi)
    : `${localizeProfileValue(detail.label, t, isHindi)}: ${localizeProfileValue(detail.value, t, isHindi)}`;

const ProfileFlipCard = ({
  profile,
  enableFlip = true,
}) => {
  const { cards } = useSiteSettings();
  const { t, isHindi } = useLanguage();
  const profileName = getProfileName(profile);
  const localizedProfileName = t(profileName);
  const imageUrl = getProfileImage(profile);
  const circularImage = !isScientistCard(profile);
  const employeeId = profile.employeeId || profile.employee_id;
  const details = [
    profile.specialization
      ? localizeProfileValue(profile.specialization, t, isHindi)
      : null,
    profile.experience
      ? `${t("Experience")}: ${localizeProfileValue(profile.experience, t, isHindi)}`
      : null,
    profile.publications
      ? `${t("Publications")}: ${localizeProfileValue(profile.publications, t, isHindi)}`
      : null,
  ].filter(Boolean);
  const mappedDetails =
    profile.details?.map((detail) => renderDetail(detail, t, isHindi)) || [];
  const canFlip = enableFlip && Boolean(details.length || mappedDetails.length || profile.email || profile.contact);
  const front = (
    <div className="profile-flip-face profile-flip-front flex min-h-[348px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_38px_rgba(18,50,74,0.075)]">
      <div
        className={`relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#e9f5ef_0%,#eef6fb_100%)] ${
          circularImage ? "grid h-48 place-items-center p-5" : "h-44"
        }`}
      >
        {imageUrl && circularImage ? (
          <div className="rsac-circular-portrait h-36 w-36 border-4 border-white bg-white shadow-[0_14px_38px_rgba(18,50,74,0.14)]">
            <img
              src={imageUrl}
              alt={localizedProfileName}
              className="rsac-circular-portrait__image"
              style={{
                objectPosition: profile.objectPosition || "center 22%",
              }}
              loading="lazy"
              onError={(event) => {
                const frame = event.currentTarget.parentElement;
                frame.style.display = "none";
                frame.nextElementSibling?.classList.remove("hidden");
              }}
            />
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={localizedProfileName}
            className="h-full w-full object-contain object-center p-1.5"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}

        <div
          className={`${imageUrl ? "hidden" : ""} absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#e9f5ef_0%,#eef6fb_100%)]`}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full border border-emerald-900/10 bg-white text-[#0f6f42] shadow-sm">
            <UserRound className="h-9 w-9" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0b6fa4]">
          {employeeId
            ? `${t("ID")}: ${employeeId}`
            : t(profile.category) || cards?.profileFallback || t("Profile")}
        </p>

        <h2 className="mt-2 text-base font-extrabold leading-snug text-[#102f46]">
          {localizedProfileName}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-snug text-[#0f6f42]">
          {t(profile.designation || profile.role)}
        </p>

        <p className="mt-auto pt-3 text-sm leading-snug text-slate-600">
          {t(profile.deployment || profile.department)}
        </p>
      </div>
    </div>
  );

  if (!canFlip) {
    return (
      <article className="rsac-profile-card rsac-cv-card min-h-[348px]">
        {front}
      </article>
    );
  }

  return (
    <article className="profile-flip-card rsac-profile-card rsac-cv-card min-h-[348px]" tabIndex={0}>
      <div className="profile-flip-inner min-h-[348px]">
        {front}

        <div
          onWheel={handleNestedWheel}
          data-lenis-prevent
          className="rsac-card-scroll profile-flip-face profile-flip-back absolute inset-0 flex flex-col overflow-y-auto rounded-lg border border-emerald-900/10 bg-[#082032] p-4 text-white shadow-[0_18px_55px_rgba(18,50,74,0.12)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">
            {cards?.additionalInformation || t("Additional Information")}
          </p>

          <h3 className="mt-3 text-base font-extrabold leading-snug text-white">
            {localizedProfileName}
          </h3>

          <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/78">
            {details.map((detail) => (
              <p key={detail}>
                {detail}
              </p>
            ))}

            {mappedDetails.map((detail) => (
              <p key={detail}>
                {detail}
              </p>
            ))}
          </div>

          <div className="mt-auto space-y-2 pt-4 text-sm text-white/78">
            {profile.email && (
              <p className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" aria-hidden="true" />
                <span className="min-w-0 break-words">{profile.email}</span>
              </p>
            )}

            {profile.contact && (
              <p className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" aria-hidden="true" />
                <span className="min-w-0 break-words">{profile.contact}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProfileFlipCard;
