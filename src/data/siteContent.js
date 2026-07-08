export const officialSourceLinks = {
  home: "https://rsac.up.gov.in/",
  scientificManpower: "https://rsac.up.gov.in/en/page/scientific-manpower",
  agricultureDivision: "https://rsac.up.gov.in/en/page/agriculture-resources-division1",
  earthDivision: "https://rsac.up.gov.in/en/page/earth-resources-division1",
  dataBankDivision: "https://rsac.up.gov.in/en/page/geo-spatial-data-bank-division1",
  schoolOfGeoinformatics: "https://rsac.up.gov.in/en/page/school-of-geo-informatics-division1",
  contact: "https://rsac.up.gov.in/en/page/contact-details",
};

export const divisions = [
  {
    id: "agriculture-resources",
    title: "Agriculture Resources Division",
    lead: "Crop assessment, monitoring, and seasonal agricultural intelligence using multi-temporal and multi-spectral satellite data.",
    source: officialSourceLinks.agricultureDivision,
    highlights: [
      "Crop-wise area and production estimation for wheat, paddy, mustard, potato, sugarcane, and Rabi pulses.",
      "Horticulture, crop-loss, crop-status, residue-burning, and cold-storage related geospatial applications.",
      "Projects with state departments, NRSC Hyderabad, SAC Ahmedabad, DST Government of India, agricultural universities, and international agencies.",
    ],
  },
  {
    id: "computer-image-processing",
    title: "Computer Image Processing Division",
    lead: "Geoinformatics, image-processing, database, and information-system support for RSAC-UP workflows.",
    source: officialSourceLinks.home,
    highlights: [
      "Information-system solutions in the geospatial domain.",
      "Satellite image processing, GIS database support, archiving, retrieval, and application workflows.",
      "Technical support for remote sensing satellites, spatial data, and ancillary non-spatial datasets.",
    ],
  },
  {
    id: "earth-resources",
    title: "Earth Resources Division",
    lead: "Geomorphology, lineament mapping, channel migration, landslide-risk inputs, and natural-resource mapping.",
    source: officialSourceLinks.earthDivision,
    highlights: [
      "1:10,000 scale channel migration and geomorphological mapping for important river catchments of Uttar Pradesh.",
      "Natural Resources Information System and geospatial database creation for landuse, landcover, infrastructure, slope, geomorphology, and lineament themes.",
      "Inputs for landslide risk management, geoenvironmental assessment, river dynamics, mining lease digitization, and wetland mapping.",
    ],
  },
  {
    id: "forest-resources-ecology",
    title: "Forest Resources and Ecology Division",
    lead: "Forest, ecology, biodiversity, environmental, and wildlife-habitat applications of satellite data and GIS.",
    source: officialSourceLinks.scientificManpower,
    highlights: [
      "Forest mapping, ecology, wildlife, environment, biodiversity, landuse, and landcover work.",
      "Geo-referenced forest-boundary and ecological information support.",
      "Environmental assessment and natural-resource planning with remote sensing and GIS.",
    ],
  },
  {
    id: "groundwater-resources",
    title: "Groundwater Resources Division",
    lead: "Groundwater exploration, hydrogeomorphology, geophysical studies, and water-resource planning.",
    source: officialSourceLinks.scientificManpower,
    highlights: [
      "Groundwater-resource studies using geophysical and remote sensing techniques.",
      "GIS, GPS, resistivity survey, and hydrogeomorphological mapping support.",
      "Rain-water harvesting, groundwater prospect mapping, and surface-water linkages.",
    ],
  },
  {
    id: "geo-spatial-data-bank",
    title: "Geo-Spatial Data Bank Division",
    lead: "Digital spatial repository, GIS database creation, mapping, and application-development support.",
    source: officialSourceLinks.dataBankDivision,
    highlights: [
      "Spatial database creation, remote sensing data support, and geospatial application workflows.",
      "Data archiving, retrieval, inference, and decision-support enablement.",
      "Support for GIS infrastructure, user departments, and centre-wide technical delivery.",
    ],
  },
  {
    id: "landuse-urban-survey",
    title: "Landuse and Urban Survey Division",
    lead: "Landuse, landcover, urban planning, and settlement-analysis support using remote sensing and GIS.",
    source: officialSourceLinks.scientificManpower,
    highlights: [
      "Urban planning and landuse or landcover mapping.",
      "Utility mapping and high-resolution satellite data interpretation.",
      "Spatial growth, urban infrastructure, and public-planning datasets.",
    ],
  },
  {
    id: "soil-resources",
    title: "Soil Resources Division",
    lead: "Soil survey, degraded-land assessment, sodic-land monitoring, and reclamation-impact studies.",
    source: officialSourceLinks.scientificManpower,
    highlights: [
      "Sodic-land mapping and monitoring using satellite data, aerial photography, GIS, and remote sensing.",
      "Annual soil monitoring, soil fertility, soil carbon, and degraded or wasteland assessment.",
      "Soil laboratory linkage for pH, EC, organic matter, texture, CEC, cations, anions, micronutrients, and pesticide residue.",
    ],
  },
  {
    id: "surface-water-resources",
    title: "Surface Water Resources Division",
    lead: "Surface-water studies, flood mapping, cadastral mapping, river dynamics, and water-resource intelligence.",
    source: officialSourceLinks.scientificManpower,
    highlights: [
      "Remote sensing and GIS applications in surface-water management and flood mapping.",
      "Cadastral mapping, river dynamics, and glaciological studies.",
      "LiDAR, bathymetry, and disaster-management planning support.",
    ],
  },
  {
    id: "training",
    title: "Training Division",
    lead: "Capacity building for line departments, academics, project work, dissertation support, and GIS training.",
    source: officialSourceLinks.contact,
    highlights: [
      "Training support for line departments, academic institutions, and other user groups.",
      "Project work and dissertation support as part of graduate and postgraduate programmes.",
      "Remote sensing, GIS, and geospatial technology capacity-building workflows.",
    ],
  },
  {
    id: "school-of-geoinformatics",
    title: "School of Geo-Informatics",
    lead: "M.Tech. in Remote Sensing and GIS, run by RSAC-UP since 2013.",
    source: officialSourceLinks.schoolOfGeoinformatics,
    highlights: [
      "Two-year, four-semester M.Tech. course in Remote Sensing and GIS.",
      "Affiliated to Dr. A.P.J. Abdul Kalam Technical University and approved by AICTE, Government of India.",
      "Remote sensing, digital image processing, GIS, GPS, DGPS, LiDAR, bathymetry, and applications across natural-resource domains.",
    ],
  },
];

export const facilities = [
  {
    title: "Geoinformatics Facilities",
    text: "Information-system solutions in the geospatial domain for innovation, execution, inference, archiving, and retrieval of satellite and ancillary datasets.",
  },
  {
    title: "LiDAR and Bathymetry",
    text: "State-of-art laboratory support for LiDAR and SONAR data processing, including advanced computation resources for 3D point-cloud workflows.",
  },
  {
    title: "Data Bank",
    text: "Digital repository and data-support function for satellite imagery, GIS layers, and project datasets.",
  },
  {
    title: "Water Analysis Lab",
    text: "Water-quality and related analysis support for centre projects and resource-management studies.",
  },
  {
    title: "Soil Analysis Lab",
    text: "Basic and advanced soil analysis for pH, EC, organic matter, texture, CEC, cations, anions, micronutrients, and pesticide residue.",
  },
  {
    title: "Technical Cell",
    text: "Technical coordination, documentation, and support for RSAC-UP project delivery.",
  },
  {
    title: "Library",
    text: "Reference support for remote sensing, GIS, geoinformatics, natural-resource management, and academic programmes.",
  },
  {
    title: "Cartography and Reprography",
    text: "Map production, cartographic support, and reproducible geospatial-output preparation.",
  },
  {
    title: "Training Hostels",
    text: "Residential support for training participants, researchers, students, and visiting officials.",
  },
  {
    title: "Service Block",
    text: "Operational support infrastructure for centre administration and programme delivery.",
  },
];

export const contactDetails = {
  title: "Director, Remote Sensing Applications Centre, U.P.",
  address: "Sector - G, Jankipuram, Kursi Road, Lucknow-226021",
  email: "director.rsac-up@rsac.up.gov.in",
  phone: "0522-2730451, 2733496 (Direct)",
  mobile: "+91 8765977649",
  contacts: [
    {
      role: "Head, Training Division",
      information: "Line Departments / Academical or Any other Training, Project Work / Dissertation",
      name: "Shri Amit Sinha",
      detail: "+91 8765977665, amitsinha.77665@gov.in",
    },
    {
      role: "Head, School of Geo-Informatics",
      information: "M.Tech. Programme in Remote Sensing and GIS",
      name: "Dr. Sudhakar Shukla",
      detail: "+91 8765977668, sudhakarshukla@rediffmail.com",
    },
  ],
};
