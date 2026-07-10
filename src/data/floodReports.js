/**
 * Flood daily reports and flood programme content.
 *
 * Mirrors the "Flood" section of the official RSAC-UP website, where daily
 * flood inundation reports are published during the monsoon season.
 * Local PDF copies keep the fallback website independent from the legacy site.
 * Drupal flood report documents replace these files when CMS is
 * enabled (see cmsService.getFloodData).
 */

const floodPdf2025 = (file) => `/documents/flood/2025/${file}`;

export const floodSection = {
  eyebrow: "Disaster Response",
  title: "Flood Daily Reports & Monitoring",
  intro:
    "During the monsoon season, RSAC-UP publishes daily satellite-based flood inundation reports for affected districts of Uttar Pradesh. Reports combine multi-sensor satellite data with field inputs to support relief and response operations.",
  note:
    "Daily reports are published during the active monsoon period (typically July to October). Outside this period, the latest season's archive remains available below, and earlier seasons can be opened from the year-wise archive.",
  programmeHeading: "Flood programme of RSAC-UP",
  programmes: [
    {
      id: "daily-inundation",
      title: "Daily Flood Inundation Mapping",
      description:
        "Near-real-time mapping of inundated areas from satellite passes during the monsoon, shared with the Relief Commissioner and district administration.",
      icon: "radar",
    },
    {
      id: "hazard-zonation",
      title: "Flood Hazard Zonation",
      description:
        "Multi-year flood layers combined into hazard zonation maps that identify recurrently affected villages, embankments, and infrastructure.",
      icon: "map",
    },
    {
      id: "damage-assessment",
      title: "Post-Flood Damage Assessment",
      description:
        "Crop-area and settlement damage assessment after major flood events to support compensation and rehabilitation planning.",
      icon: "scan",
    },
  ],
  archiveHeading: "Year-wise flood archive",
  archiveNote:
    "Older approved reports can be added as documents or archive links from Drupal.",
  archives: [],
  resourcesHeading: "Related portals",
  resources: [
    {
      label: "Relief Commissioner, Uttar Pradesh",
      url: "https://rahat.up.nic.in",
      description: "State disaster relief operations and flood bulletins.",
    },
    {
      label: "India-WRIS",
      url: "https://indiawris.gov.in",
      description: "National water resources information system.",
    },
    {
      label: "Bhuvan (NRSC)",
      url: "https://bhuvan.nrsc.gov.in",
      description: "ISRO geoportal with flood hazard services.",
    },
  ],
};

export const floodReports = [
  {
    id: "fr-2025-10-10-up",
    title: "Daily Flood Report — UP State Summary",
    date: "2025-10-10",
    dateLabel: "10/10/2025",
    category: "Daily Report",
    coverage: "State-wide",
    meta: "PDF | English",
    url: floodPdf2025("2025-10-10-up-state-summary.pdf"),
  },
  {
    id: "fr-2025-10-10-skn",
    title: "Flood Inundation Report — Sant Kabir Nagar",
    date: "2025-10-10",
    dateLabel: "10/10/2025",
    category: "District Report",
    coverage: "Sant Kabir Nagar",
    meta: "PDF | English",
    url: floodPdf2025("2025-10-10-sant-kabir-nagar.pdf"),
  },
  {
    id: "fr-2025-10-10-mirzapur",
    title: "Flood Inundation Report — Mirzapur",
    date: "2025-10-10",
    dateLabel: "10/10/2025",
    category: "District Report",
    coverage: "Mirzapur",
    meta: "PDF | English",
    url: floodPdf2025("2025-10-10-mirzapur.pdf"),
  },
  {
    id: "fr-2025-09-29-up",
    title: "Daily Flood Report — UP State Summary",
    date: "2025-09-29",
    dateLabel: "29/09/2025",
    category: "Daily Report",
    coverage: "State-wide",
    meta: "PDF | English",
    url: floodPdf2025("2025-09-29-up-state-summary.pdf"),
  },
  {
    id: "fr-2025-09-09-gorakhpur",
    title: "Flood Inundation Report — Gorakhpur",
    date: "2025-09-09",
    dateLabel: "09/09/2025",
    category: "District Report",
    coverage: "Gorakhpur",
    meta: "PDF | English",
    url: floodPdf2025("2025-09-09-gorakhpur.pdf"),
  },
  {
    id: "fr-2025-08-21-up",
    title: "Daily Flood Report — UP State Summary",
    date: "2025-08-21",
    dateLabel: "21/08/2025",
    category: "Daily Report",
    coverage: "State-wide",
    meta: "PDF | English",
    url: floodPdf2025("2025-08-21-up-state-summary.pdf"),
  },
];
