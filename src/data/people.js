import { officials } from "./officials";

const scientistImage = (fileName) => `/scientists/${fileName}`;

export const leadershipProfiles = officials.map((official) => ({
  ...official,
  category: "Leadership",
  source: "https://rsac.up.gov.in/",
  details: [
    official.department,
    "Listed by RSAC-UP under Hon'ble leadership and institutional governance.",
  ],
}));

export const scientistProfiles = [
  {
    name: "Shri Sushil Chandra",
    designation: "Scientist-SF and Head of Division",
    deployment: "Computer Image Processing Division",
    employeeId: "E-195",
    image: scientistImage("sushil-chandra.jpg"),
    specialization:
      "Computer science, strategic planning of information systems, computer networks, geospatial systems, and management.",
    experience: "32+ years",
    publications: "-",
    contact: "8765977653",
    email: "schandra.77653@gov.in",
  },
  {
    name: "Dr. Sudhakar Shukla",
    designation: "Scientist-SE and Head, School of Geoinformatics Division",
    deployment: "School of Geo-Informatics",
    employeeId: "E-142",
    image: scientistImage("sudhakar-shukla.jpg"),
    specialization:
      "Water resources, satellite remote sensing, GIS, LiDAR, GPS, geoenvironmental assessment, and disaster-management planning.",
    experience: "+28 years",
    publications: "58 publications and 31 reports",
    contact: "0522-2730815 Ext. 120, 8765977668, 9335918075",
    email: "sshukla.77668@gov.in, shuklasudhakar1@gmail.com",
  },
  {
    name: "Shri S. K. S. Yadav",
    designation: "Scientist-SE",
    deployment: "Water and groundwater resource studies",
    employeeId: "E-231",
    image: scientistImage("sks-yadav.jpg"),
    specialization:
      "Groundwater resources, surface-water resources, glaciological studies, digital image processing, and terrestrial LiDAR mapping.",
    experience: "26 years",
    publications: "18 research papers and 18 technical reports",
    contact: "8765999656",
    email: "sksyadav42@gmail.com, sksyadav.77656@gov.in",
  },
  {
    name: "Dr. M.S. Yadav",
    designation: "Scientist-SE and Head, Soil Resources Division",
    deployment: "Soil Resources Division",
    employeeId: "Not listed",
    image: scientistImage("ms-yadav.jpg"),
    specialization:
      "Sodic-land mapping, annual soil monitoring, digital image processing, GIS, remote sensing, and reclamation-impact assessment.",
    experience: "26 years",
    publications: "24 research papers in national and international journals",
    contact: "8765977667",
    email: "msyadav.77667@gov.in, madhupendray@gmail.com",
  },
  {
    name: "Dr. Aniruddha Uniyal",
    designation:
      "Scientist-SE; Head, Earth Resources Division; Scientific Adviser to Hon. Chairman G.B.",
    deployment: "Earth Resources Division",
    employeeId: "E-240",
    image: scientistImage("aniruddha-uniyal.jpg"),
    specialization:
      "Geosciences, landslide management, natural-resource management, geoenvironmental assessment, site suitability, and disaster management.",
    experience: "27 years",
    publications: "64 research papers/articles and 2 books",
    contact: "-",
    email: "auniyal.77670@gov.in, aniruddhauniyal@yahoo.com",
  },
  {
    name: "Shri Narendra Kumar",
    designation: "Scientist-SE",
    deployment: "Agriculture Resources Division",
    employeeId: "E-235",
    image: scientistImage("narendra-kumar.jpg"),
    specialization:
      "Remote sensing and GIS applications in agriculture.",
    experience: "27 years",
    publications: "25 research papers and 33 technical reports",
    contact: "8765977663, 9450459205",
    email: "narendrakumar.77663@gov.in, rsacupnk@rediffmail.com",
  },
  {
    name: "Dr. Udai Raj",
    designation: "Scientist-SE",
    deployment: "Computer Image Processing and Data Management Division",
    employeeId: "E-224",
    image: scientistImage("udai-raj.jpg"),
    specialization: "Agriculture and horticulture.",
    experience: "24 years",
    publications: "15 research papers and 25 technical reports",
    contact: "9415765623, 8765977657",
    email: "udai_raja@rediffmail.com, udairaj.7765@gov.in",
  },
  {
    name: "Shri Amit Sinha",
    designation: "Scientist-SE and Head, Training Division",
    deployment: "Training Division / Administrative Officer (additional charge)",
    employeeId: "E-228",
    image: scientistImage("amit-sinha.jpg"),
    specialization: "Remote sensing and engineering geosciences.",
    experience: "More than 30 years",
    publications: "25 research papers, 33 technical reports, 6 atlases",
    contact: "+91 8765977665, +91 9335916167, 0522-2730854 Ext. 254",
    email: "amitsinha.77665@gov.in",
  },
  {
    name: "Dr. Anil Kumar",
    designation: "Scientist-SE",
    deployment: "Forest Resources and Ecology Division",
    employeeId: "E-294",
    image: scientistImage("anil-kumar.jpg"),
    specialization: "Soils, forestry, remote sensing, GIS, and GPS.",
    experience: "More than 24 years",
    publications: "11 research papers and 90 reports",
    contact: "+91 8765977669",
    email: "anilkumar.77669@gov.in, anilrsac@gmail.com",
  },
  {
    name: "Dr. Kaushlendra Singh",
    designation: "Scientist-SD",
    deployment: "Soil Resources Division",
    employeeId: "E-1752",
    image: scientistImage("kaushlendra-singh.JPG"),
    specialization: "Degraded and wasteland management, soil fertility, and soil carbon dynamics.",
    experience: "20 years",
    publications: "17 research papers in national and international journals",
    contact: "8765977674",
    email: "kaushalendra.77674@gov.in, drksinghn@gmail.com",
  },
  {
    name: "Dr. Sangharsh Rao",
    designation: "Scientist-SD",
    deployment: "Surface Water Resource Division",
    employeeId: "E-1755",
    image: scientistImage("sangharsh-rao.jpg"),
    specialization: "Remote sensing, GIS, archaeology, LiDAR, and bathymetry.",
    experience: "13 years",
    publications: "14",
    contact: "8765977673, 0522-2730815",
    email: "shangharsh.77673@gov.in, sangharshrao@gmail.com",
  },
  {
    name: "Shri Arjun Singh",
    designation: "Scientist-SD",
    deployment: "Groundwater Resources Division",
    employeeId: "E-1754",
    image: scientistImage("arjun-singh.jpg"),
    specialization:
      "Remote sensing, GIS, GPS, groundwater, and rain-water harvesting.",
    experience: "19 years",
    publications: "Not listed",
    contact: "9415788521, 8765977671",
    email: "arjunsingh.77671@gov.in, arjunrsac@gmail.com",
  },
  {
    name: "Sri Pushpendra Pratap Singh Yadav",
    designation: "Scientist-SD",
    deployment: "Agriculture Resources Division",
    employeeId: "E-1753",
    image: scientistImage("pushpendra-yadav.jpg"),
    specialization: "Soil survey, remote sensing, GIS, and GNSS.",
    experience: "19 years",
    publications: "16 research papers and 80 technical reports",
    contact: "+91 9450170772, 8765977672",
    email: "ppsyadav.77672@gov.in, ppsyadav77@gmail.com",
  },
  {
    name: "Shri Alok Saini",
    designation: "Scientist-SC",
    deployment: "Landuse and Urban Survey Division",
    employeeId: "E-238",
    image: scientistImage("alok-saini.jpg"),
    specialization: "Urban planning, landuse/landcover mapping, remote sensing, and GIS.",
    experience: "25 years",
    publications: "-",
    contact: "9839912030",
    email: "alok22122@gmail.com",
  },
].map((profile) => ({
  ...profile,
  source: "https://rsac.up.gov.in/en/page/scientific-manpower",
  category: "Scientific Manpower",
}));

export const technicalProfiles = [
  {
    name: "Geo-Spatial Data Bank Team",
    designation: "Technical and data support group",
    deployment: "Geo-Spatial Data Bank Division",
    specialization:
      "GIS database creation, data archiving, satellite data handling, map production, and application support.",
    source: "https://rsac.up.gov.in/en/page/geo-spatial-data-bank-division1",
  },
  {
    name: "LiDAR and Bathymetry Team",
    designation: "Advanced survey and processing support",
    deployment: "LiDAR and Bathymetry Facilities",
    specialization:
      "3D point-cloud processing, mobile LiDAR, terrestrial LiDAR, SONAR data, and terrain/bathymetry workflows.",
    source: "https://rsac.up.gov.in/",
  },
  {
    name: "Cartography and Reprography Team",
    designation: "Mapping and publication support",
    deployment: "Cartography and Reprography",
    specialization:
      "Map preparation, cartographic layout, reprography, and geospatial output support for project teams.",
    source: "https://rsac.up.gov.in/",
  },
];

export const administrationProfiles = [
  {
    name: "Director, RSAC-UP",
    designation: "Remote Sensing Applications Centre, U.P.",
    deployment: "Sector - G, Jankipuram, Kursi Road, Lucknow-226021",
    image: "/officials/ramesh-chandra.jpeg",
    specialization:
      "Institutional administration, project coordination, user-department engagement, and centre-level governance.",
    contact: "0522-2730451, 2733496 (Direct)",
    email: "director.rsac-up@rsac.up.gov.in",
    source: "https://rsac.up.gov.in/en/page/contact-details",
  },
  {
    name: "Shri Amit Sinha",
    designation: "Administrative Officer (additional charge)",
    deployment: "Training Division / Administration",
    image: scientistImage("amit-sinha.jpg"),
    specialization:
      "Training coordination, departmental communication, academic support, and administrative coordination.",
    contact: "+91 8765977665",
    email: "amitsinha.77665@gov.in",
    source: "https://rsac.up.gov.in/en/page/contact-details",
  },
  {
    name: "Web Information Manager",
    designation: "Website information contact",
    deployment: "RSAC-UP website",
    specialization:
      "Website content coordination and official public-information support.",
    source: "https://rsac.up.gov.in/",
  },
];

export const manpowerGroups = [
  {
    title: "Scientific Manpower",
    count: "14",
    text: "Scientists across agriculture, earth resources, soil, surface water, groundwater, forest, landuse, training, data bank, and geoinformatics.",
    path: "/scientists",
  },
  {
    title: "Technical Support",
    count: "Multi-disciplinary",
    text: "GIS, image-processing, LiDAR, bathymetry, cartography, reprography, laboratory, library, and data-bank support teams.",
    path: "/technical-staff",
  },
  {
    title: "Administration",
    count: "Centre-level",
    text: "Director office, administrative coordination, training coordination, website information, and user-department communication.",
    path: "/administration",
  },
  {
    title: "Academic Support",
    count: "M.Tech.",
    text: "School of Geo-Informatics and Training Division support for students, officials, researchers, and line departments.",
    path: "/academics/school-of-geo-informatics-",
  },
];
