/**
 * Local Flood defaults used until CMS content loads.
 * Historical PDFs remain local while page labels and archive years come from
 * the CMS.
 */

const floodPdf2025 = (file) => `/documents/flood/2025/${file}`;

export const floodSection = {
  archives: [],
  archiveItemLabel: "Flood",
  criticalMapLabel: "Flood Critical Map",
  criticalMapUrl: "/documents/flood/flood-critical-map.pdf",
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
