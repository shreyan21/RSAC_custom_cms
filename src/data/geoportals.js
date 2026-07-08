import {
  Database,
  Globe2,
  GraduationCap,
  Map,
  Network,
  RadioTower,
} from "lucide-react";

export const geoportals = [
  {
    title: "PM Gati Shakti",
    description:
      "Integrated infrastructure planning and coordination platform for Uttar Pradesh.",
    url: "https://up.pmgatishakti.gov.in/UttarPradesh",
    icon: Network,
    accent: "bg-[#ff9933]",
    accentHex: "#ea7a13",
  },
  {
    title: "Pahuch",
    description:
      "Education geospatial login for school-location and access planning workflows.",
    url: "https://upeducation.ncog.gov.in/upedu/login",
    icon: GraduationCap,
    accent: "bg-[#138808]",
    accentHex: "#138808",
  },
  {
    title: "Bhuvan",
    description:
      "NRSC satellite-data viewer for imagery, thematic layers, and map services.",
    url: "http://bhuvan.nrsc.gov.in/bhuvan_links.php",
    icon: Globe2,
    accent: "bg-[#0b6fa4]",
    accentHex: "#0b6fa4",
  },
  {
    title: "NGDR",
    description:
      "National registry for discovering geospatial datasets and map resources.",
    url: "https://geodataindia.gov.in",
    icon: Database,
    accent: "bg-[#b7892f]",
    accentHex: "#b7892f",
  },
  {
    title: "VEDAS",
    description:
      "Earth-observation visualization and archival platform from Space Applications Centre.",
    url: "https://vedas.sac.gov.in/en/",
    icon: RadioTower,
    accent: "bg-[#0f766e]",
    accentHex: "#0f766e",
  },
  {
    title: "Samvedan",
    description:
      "RSAC-UP service portal for remote-sensing datasets and geospatial applications.",
    url: "http://14.139.43.115:8090/samvedan_2/",
    icon: Map,
    accent: "bg-emerald-700",
    accentHex: "#047857",
  },
];
