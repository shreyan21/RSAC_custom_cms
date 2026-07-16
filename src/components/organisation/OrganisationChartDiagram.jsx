import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import "./organisation-chart.css";

const CHART_WIDTH = 1280;
const CHART_HEIGHT = 600;

const generalBodyKeys = [
  "general-body-president",
  "general-body-vice-president-1",
  "general-body-vice-president-2",
];

const divisionKeys = Array.from({ length: 11 }, (_, index) => `division-${index + 1}`);
const supportKeys = Array.from({ length: 3 }, (_, index) => `support-${index + 1}`);

const fallbackPhotos = {
  "general-body-president": "/organisation-chart-photos/chief-minister.jpg",
  "general-body-vice-president-1": "/organisation-chart-photos/minister.jpg",
  "general-body-vice-president-2": "/organisation-chart-photos/minister-of-state.jpg",
  "governing-body-chairman": "/organisation-chart-photos/principal-secretary.jpg",
  "executive-director": "/organisation-chart-photos/director.jpg",
};

const designationLines = (item) => [item?.role, item?.post].filter(
  (value) => value && !["Scientific Divisions", "Support Functions"].includes(value)
);

const useChartScale = () => {
  const viewportRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    let active = true;

    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      const availableHeight = Math.max(260, window.innerHeight - Math.max(bounds.top, 0) - 16);
      const widthScale = viewport.clientWidth / CHART_WIDTH;
      const heightScale = availableHeight / CHART_HEIGHT;
      const nextScale = viewport.clientWidth < 720
        ? Math.min(0.72, heightScale, 1)
        : Math.min(widthScale, heightScale, 1);
      if (active) setScale(Math.max(0.35, Number(nextScale.toFixed(3))));
    };

    resize();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(viewport);
    document.fonts?.ready.then(resize);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);

  return { viewportRef, scale };
};

const LeadershipCard = ({ item, roleKey, variant = "general" }) => {
  const photo = item?.photo || fallbackPhotos[roleKey];
  return (
    <article
      className={`org-chart-leader org-chart-leader--${variant}`}
      aria-label={[item?.name, ...designationLines(item)].filter(Boolean).join(", ")}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          style={{ objectPosition: item?.objectPosition || "center" }}
          onError={(event) => {
            const fallback = fallbackPhotos[roleKey];
            if (fallback && !event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
          }}
          loading="lazy"
          decoding="async"
        />
      )}
      <div>
        <span>{item?.title}</span>
        <strong>{item?.name}</strong>
        {designationLines(item).map((designation) => <small key={designation}>{designation}</small>)}
      </div>
    </article>
  );
};

const DivisionCard = ({ item }) => (
  <article
    className="org-chart-division-card"
    aria-label={[item?.title, item?.name, ...designationLines(item)].filter(Boolean).join(", ")}
  >
    <strong>{item?.title}</strong>
    <span>
      <b>{item?.name}</b>
      <small>{designationLines(item).join(" · ")}</small>
    </span>
  </article>
);

const SupportCard = ({ item }) => (
  <article
    className="org-chart-support-card"
    aria-label={[item?.title, item?.name, ...designationLines(item)].filter(Boolean).join(", ")}
  >
    <strong>{item?.title}</strong>
    <span>{item?.name}</span>
    <small>{designationLines(item).join(" · ")}</small>
  </article>
);

const OrganisationChartDiagram = ({ roles = [], className = "" }) => {
  const { t } = useLanguage();
  const rolesByKey = new Map(roles.map((item) => [item.roleKey, item]));
  const markerId = `org-arrow-${useId().replace(/:/g, "")}`;
  const { viewportRef, scale } = useChartScale();

  return (
    <div
      ref={viewportRef}
      className={`org-chart-viewport ${className}`}
      role="group"
      aria-label={t("Organisational structure of the Remote Sensing Applications Centre, Uttar Pradesh")}
    >
      <div
        className="org-chart-scale-shell"
        style={{ width: CHART_WIDTH * scale, height: CHART_HEIGHT * scale }}
      >
        <div
          className="org-chart-stage"
          style={{ width: CHART_WIDTH, height: CHART_HEIGHT, transform: `scale(${scale})` }}
        >
          <svg className="org-chart-connectors" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden="true">
            <defs>
              <marker id={markerId} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>

            <path d="M640 58 V70 M220 70 H1060" />
            <path d="M220 70 V84" markerEnd={`url(#${markerId})`} />
            <path d="M640 70 V84" markerEnd={`url(#${markerId})`} />
            <path d="M1060 70 V84" markerEnd={`url(#${markerId})`} />

            <path d="M220 184 V206 M640 184 V206 M1060 184 V206 M220 206 H1060" />
            <path d="M430 206 V214" markerEnd={`url(#${markerId})`} />

            <path d="M610 258 H670" markerEnd={`url(#${markerId})`} />

            <path d="M850 302 V318 M480 318 H1114" />
            <path d="M480 318 V340" markerEnd={`url(#${markerId})`} />
            <path d="M1114 318 V340" markerEnd={`url(#${markerId})`} />
          </svg>

          <div className="org-chart-institution">
            <span>RSAC-UP</span>
            <strong>{t("Remote Sensing Applications Centre, Uttar Pradesh")}</strong>
          </div>

          <div className="org-chart-general-tier">
            {generalBodyKeys.map((roleKey) => (
              <LeadershipCard key={roleKey} roleKey={roleKey} item={rolesByKey.get(roleKey)} />
            ))}
          </div>

          <div className="org-chart-governance-card">
            <LeadershipCard
              roleKey="governing-body-chairman"
              item={rolesByKey.get("governing-body-chairman")}
              variant="governance"
            />
          </div>

          <div className="org-chart-executive-card">
            <LeadershipCard
              roleKey="executive-director"
              item={rolesByKey.get("executive-director")}
              variant="executive"
            />
          </div>

          <section className="org-chart-division-group" aria-label={t("Scientific Divisions")}>
            <h3>{t("Scientific Divisions")}</h3>
            <div>
              {divisionKeys.map((roleKey) => <DivisionCard key={roleKey} item={rolesByKey.get(roleKey)} />)}
            </div>
          </section>

          <section className="org-chart-support-group" aria-label={t("Support Functions")}>
            <h3>{t("Support Functions")}</h3>
            <div>
              {supportKeys.map((roleKey) => <SupportCard key={roleKey} item={rolesByKey.get(roleKey)} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrganisationChartDiagram;
