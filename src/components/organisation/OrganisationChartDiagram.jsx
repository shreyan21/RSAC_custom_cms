import { useLanguage } from "../../hooks/useLanguage";

const CHART_WIDTH = 1110;
const CHART_HEIGHT = 1350;

const leadershipCards = [
  { roleKey: "general-body-president", x: 144, y: 47, width: 182, height: 249 },
  { roleKey: "general-body-vice-president-1", x: 774, y: 47, width: 181, height: 242 },
  { roleKey: "general-body-vice-president-2", x: 779, y: 302, width: 180, height: 243 },
  {
    roleKey: "governing-body-chairman",
    x: 139,
    y: 370,
    width: 181,
    height: 241,
    designation: "post",
  },
  {
    roleKey: "governing-body-chairman",
    x: 779,
    y: 562,
    width: 180,
    height: 241,
    designation: "role",
  },
  { roleKey: "executive-director", x: 436, y: 631, width: 183, height: 242 },
];

const divisionCards = Array.from({ length: 11 }, (_, index) => ({
  roleKey: `division-${index + 1}`,
  x: 66 + index * 90,
  y: 1012,
  width: index === 10 ? 76 : 77,
  height: 216,
}));

const supportCards = [
  { roleKey: "support-1", x: 56, y: 1240, width: 225, height: 87 },
  { roleKey: "support-2", x: 395, y: 1240, width: 216, height: 78 },
  { roleKey: "support-3", x: 835, y: 1240, width: 234, height: 88 },
];

const fallbackPhotos = {
  "general-body-president": "/organisation-chart-photos/chief-minister.jpg",
  "general-body-vice-president-1": "/organisation-chart-photos/minister.jpg",
  "general-body-vice-president-2":
    "/organisation-chart-photos/minister-of-state.jpg",
  "governing-body-chairman":
    "/organisation-chart-photos/principal-secretary.jpg",
  "executive-director": "/organisation-chart-photos/director.jpg",
};

const cardStyle = ({ x, y, width, height }) => ({
  left: `${x}px`,
  top: `${y}px`,
  width: `${width}px`,
  height: `${height}px`,
});

const designationLines = (item, preferred) => {
  const values = preferred
    ? [item?.[preferred], preferred === "role" ? item?.post : item?.role]
    : [item?.role, item?.post];

  return values.filter(
    (value) =>
      value &&
      !["Scientific Divisions", "Support Functions"].includes(value)
  );
};

const LeadershipCard = ({ item, position }) => {
  const photo = item?.photo || fallbackPhotos[position.roleKey];
  const designations = designationLines(item, position.designation);

  return (
    <article
      className="absolute z-10 flex flex-col items-center overflow-hidden bg-[#0d4d08] px-2 pb-2 pt-2 text-center text-white"
      style={cardStyle(position)}
      aria-label={[item?.name, ...designations].filter(Boolean).join(", ")}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          className="h-[56%] w-[68%] shrink-0 border border-black/50 bg-white object-cover"
          style={{ objectPosition: item?.objectPosition || "center" }}
          onError={(event) => {
            const fallback = fallbackPhotos[position.roleKey];
            if (fallback && !event.currentTarget.src.endsWith(fallback)) {
              event.currentTarget.src = fallback;
            }
          }}
          loading="lazy"
          decoding="async"
        />
      )}
      <p className="mt-1 text-[13px] font-semibold leading-[1.08]">
        {item?.name}
      </p>
      {designations.map((designation) => (
        <p key={designation} className="mt-0.5 text-[11px] leading-[1.12]">
          {designation}
        </p>
      ))}
    </article>
  );
};

const DivisionCard = ({ item, position }) => (
  <article
    className="absolute z-10 flex flex-col items-center rounded-[28px] border border-black/75 bg-[#0d4d08] px-1.5 py-4 text-center text-white"
    style={cardStyle(position)}
    aria-label={[item?.title, item?.name, ...designationLines(item)]
      .filter(Boolean)
      .join(", ")}
  >
    <p className="text-[11px] leading-[1.08]">{item?.title}</p>
    <p className="mt-auto text-[11px] font-semibold leading-[1.08]">
      {item?.name}
    </p>
    {designationLines(item).map((designation) => (
      <p key={designation} className="mt-2 text-[9px] leading-none">
        {designation}
      </p>
    ))}
  </article>
);

const SupportCard = ({ item, position }) => (
  <article
    className="absolute z-10 flex flex-col items-center justify-center border border-black/75 bg-[#0d4d08] px-3 py-2 text-center text-white"
    style={{ ...cardStyle(position), borderRadius: "42% 42% 24% 24% / 18%" }}
    aria-label={[item?.title, item?.name, ...designationLines(item)]
      .filter(Boolean)
      .join(", ")}
  >
    <p className="text-[12px] leading-tight">{item?.title}</p>
    {item?.name && (
      <p className="mt-1 text-[11px] font-semibold leading-tight">
        {item.name}
      </p>
    )}
    {designationLines(item).map((designation) => (
      <p key={designation} className="text-[10px] leading-tight">
        {designation}
      </p>
    ))}
  </article>
);

const OrganisationChartDiagram = ({ roles = [], className = "" }) => {
  const { t } = useLanguage();
  const rolesByKey = new Map(roles.map((item) => [item.roleKey, item]));

  return (
    <div
      className={`overflow-x-auto overscroll-x-contain rounded-lg border border-slate-300 bg-[#ffffe7] ${className}`}
      role="group"
      aria-label={t(
        "Organisational structure of the Remote Sensing Applications Centre, Uttar Pradesh"
      )}
    >
      <div
        className="relative mx-auto shrink-0 overflow-hidden bg-[#ffffe7]"
        style={{
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
          backgroundImage: "url('/organisation-chart.jpg')",
          backgroundPosition: "left top",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1368px 1544px",
        }}
      >
        {leadershipCards.map((position, index) => (
          <LeadershipCard
            key={`${position.roleKey}-${index}`}
            item={rolesByKey.get(position.roleKey)}
            position={position}
          />
        ))}
        {divisionCards.map((position) => (
          <DivisionCard
            key={position.roleKey}
            item={rolesByKey.get(position.roleKey)}
            position={position}
          />
        ))}
        {supportCards.map((position) => (
          <SupportCard
            key={position.roleKey}
            item={rolesByKey.get(position.roleKey)}
            position={position}
          />
        ))}
      </div>
    </div>
  );
};

export default OrganisationChartDiagram;
