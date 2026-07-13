// Local copies under public/documents/notices keep the site independent from
// the legacy rsac.up.gov.in server. Current notice rows come from the custom CMS.
const officialPdf = (file) => `/documents/notices/${file}`;

export const notices = [
  {
    id: 1,
    title: "ADVERTISEMENT FOR THE POST OF DIRECTOR",
    category: "Advertisements",
    meta: "Size: 1 MB | Language: English",
    lastDate: "15/04/2026",
    url: officialPdf("C_202603091351186407.pdf"),
  },
  {
    id: 2,
    title:
      "STATE LEVEL PRE-NATIONAL MEET - 2025 on Leveraging Space Technology & Applications for Viksit Bharat-2047: Glimpse",
    category: "General",
    meta: "Size: 376 KB",
    lastDate: "09/07/2025",
    url: officialPdf("C_202507081745342785.pdf"),
  },
  {
    id: 3,
    title:
      "STATE LEVEL PRE-NATIONAL MEET - 2025 on Leveraging Space Technology & Applications for Viksit Bharat-2047: Media Coverage",
    category: "General",
    meta: "Size: 3 MB | Language: English",
    lastDate: "08/07/2025",
    url: officialPdf("C_202507081731289892.pdf"),
  },
  {
    id: 4,
    title:
      "Remote Sensing and GIS based Study of Ganga - Yamuna Confluence in Prayagraj between 1975 to 2025",
    category: "General",
    meta: "Size: 135 KB | Language: English",
    lastDate: "11/02/2025",
    url: officialPdf("C_202502111103006663.pdf"),
  },
];
