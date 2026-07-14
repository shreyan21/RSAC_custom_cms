import cmImage from "../assets/images/cm.webp";
import pmImage from "../assets/images/pm.webp";
import rsacLogo from "../assets/images/rsac-logo.webp";
import upLogo from "../assets/images/up-emblem.webp";
import { uiLabelDefaults } from "./uiLabels";

export const siteSettings = {
  // Short button/badge/status wording used across the whole site. Every entry
  // can be copied into custom CMS Site Settings translations.
  interfaceLabels: { ...uiLabelDefaults },
  appearance: {
    fontFamily: "Inter, sans-serif",
    homeHeadingSize: "normal",
    homeBodySize: "normal",
    primary: "#0f6f42",
    primaryDark: "#0b5f38",
    secondary: "#0b6fa4",
    ink: "#102f46",
    surface: "#f5faf7",
    accent: "#ff9933",
    radius: "12px",
    contentWidth: "1280px",
    motionScale: 1,
  },
  layout: {
    homeSections: [
      "mission",
      "about",
      "services",
      "stats",
      "location",
    ],
    hiddenHomeSections: [
      "leadership",
      "quickAccess",
      "geoportals",
      "gallery",
    ],
  },
  branding: {
    organisationName: "Remote Sensing Applications Centre, Uttar Pradesh",
    shortName: "RSAC-UP",
    subtitle:
      "An Autonomous Organisation under the Department of Science & Technology, Government of Uttar Pradesh",
    logo: rsacLogo,
    governmentLogo: upLogo,
  },
  hero: {
    title: "Remote Sensing Applications Centre",
    accentTitle: "Uttar Pradesh",
    highlights: [
      "Connects satellite observations with departmental GIS workflows for planning, monitoring, and natural-resource management.",
      "Applies satellite remote sensing, GIS, GPS, and image processing across agriculture, forests, water, landuse, urban survey, and geospatial data-bank work.",
    ],
    stats: [
      { label: "Established", value: "1982" },
      { label: "State centre", value: "1st" },
      { label: "Headquarters", value: "Lucknow" },
    ],
    domains: [
      "Agriculture Resources",
      "Forest & Ecology",
      "Groundwater Studies",
      "Flood Mapping",
    ],
    primaryAction: {
      label: "Geo-Portal Services",
      path: "/geoportals",
      icon: "map",
    },
    secondaryAction: {
      label: "Vision & Mission",
      path: "/vision",
      icon: "satellite",
    },
    capabilityTags: [
      { label: "Multi-layer governance data", icon: "layers" },
      { label: "Scientific data infrastructure", icon: "database" },
    ],
    leaders: [
      {
        name: "Shri Narendra Modi",
        role: "Hon'ble Prime Minister of India",
        image: pmImage,
        alt: "Prime Minister Narendra Modi",
        objectPosition: "center 28%",
      },
      {
        name: "Shri Yogi Adityanath",
        role: "Hon'ble Chief Minister of Uttar Pradesh",
        image: cmImage,
        alt: "Chief Minister Yogi Adityanath",
        objectPosition: "center 15%",
      },
    ],
  },
  missionPulse: {
    eyebrow: "Operational Domains",
    title: "From satellite signal to decisions on the ground",
    description:
      "RSAC-UP's scientific divisions convert multi-sensor earth observation into crop forecasts, water assessments, forest monitoring, urban planning inputs, and flood response for departments across Uttar Pradesh.",
    hint:
      "Select a domain card for a quick brief of what the Centre delivers.",
    panelHeading: "Domain Brief",
    panelCloseLabel: "Close brief",
    panelLinkLabel: "Open division",
    cardViewLabel: "View",
    cardOpenLabel: "Open",
    primaryAction: {
      label: "Scientific divisions",
      path: "/divisions",
    },
    secondaryAction: {
      label: "Open geo-portals",
      path: "/geoportals",
    },
    domains: [
      {
        id: "agriculture",
        label: "Agriculture",
        detail: "Seasonal crop intelligence",
        icon: "sprout",
        tagline: "Crop intelligence for food security",
        deliverables: [
          "Crop acreage and production estimates for wheat, paddy, sugarcane, potato, and mustard",
          "Crop-residue burning alerts and horticulture expansion mapping",
          "Crop-condition and drought assessment for the agriculture department",
        ],
        stat: { value: "75", label: "districts under seasonal crop assessment" },
        path: "/divisions/agriculture-resources-division1",
        linkLabel: "Agriculture Resources Division",
      },
      {
        id: "water",
        label: "Water Resources",
        detail: "Surface and groundwater",
        icon: "droplets",
        tagline: "Mapping every drop the state plans with",
        deliverables: [
          "Groundwater prospect maps supporting drinking-water schemes",
          "Wetland and waterbody inventory with seasonal monitoring",
          "Watershed development plans at micro and meso scale",
        ],
        stat: { value: "2", label: "dedicated surface & groundwater divisions" },
        path: "/divisions/groundwater-resources-division1",
        linkLabel: "Groundwater Resources Division",
      },
      {
        id: "forest",
        label: "Forest & Ecology",
        detail: "Ecology and biodiversity",
        icon: "trees",
        tagline: "Watching forests, wetlands, and habitats",
        deliverables: [
          "Forest cover and boundary mapping with change detection",
          "Eco-sensitive zone and biodiversity assessment",
          "Sarus crane habitat and population mapping for the State Bird",
        ],
        stat: { value: "1982", label: "monitoring UP's ecology since" },
        path: "/divisions/forest-resources-ecology-division",
        linkLabel: "Forest Resources & Ecology Division",
      },
      {
        id: "soil-land",
        label: "Soil & Land Use",
        detail: "Soil health and land cover",
        icon: "mountain",
        tagline: "Soil resources and land cover, classified",
        deliverables: [
          "State-wide land use / land cover classification",
          "Soil resource mapping with salinity and sodicity assessment",
          "Wasteland identification and reclamation planning inputs",
        ],
        stat: { value: "100%", label: "of Uttar Pradesh under LULC mapping" },
        path: "/divisions/soil-resources-division1",
        linkLabel: "Soil Resources Division",
      },
      {
        id: "urban",
        label: "Urban & Infrastructure",
        detail: "Growth and utility mapping",
        icon: "building2",
        tagline: "Planning cities with high-resolution imagery",
        deliverables: [
          "Urban growth and sprawl monitoring for master plans",
          "Utility and infrastructure mapping for urban governance",
          "High-resolution settlement and amenity mapping",
        ],
        stat: { value: "75+", label: "district and town planning initiatives" },
        path: "/divisions/landuse-amp;-urban-survey-division1",
        linkLabel: "Landuse & Urban Survey Division",
      },
      {
        id: "disaster",
        label: "Disaster & Flood",
        detail: "Monsoon response mapping",
        icon: "shield",
        tagline: "Flood intelligence when hours matter",
        deliverables: [
          "Daily flood inundation mapping during the monsoon",
          "Flood hazard zonation and post-event damage assessment",
          "Drought monitoring and hazard vulnerability studies",
        ],
        stat: { value: "Daily", label: "flood reports in the monsoon season" },
        path: "/flood-reports",
        linkLabel: "Flood Daily Reports",
      },
    ],
  },
  homeSections: {
    navigation: [
      { label: "Objective", href: "/objectives", icon: "building" },
      {
        label: "Implementation",
        href: "/implementation",
        icon: "clipboard",
      },
      { label: "Approach", href: "/approach", icon: "route" },
      {
        label: "Sphere of Activities",
        href: "/sphere-of-activities",
        icon: "activity",
      },
      { label: "Mobile Apps", href: "/mobile-apps", icon: "phone" },
    ],
    featureTabs: [
      {
        key: "objective",
        title: "Objective",
        summary:
          "RSAC-UP undertakes research, surveys, consultancy, data-bank development, and technology dissemination in remote sensing and GIS.",
        details:
          "Undertake, promote, guide, coordinate and aid research and development in remote sensing.\nCarry out surveys for monitoring and assessment of natural resources using remote sensing techniques.\nDevelop efficient data acquisition and retrieval systems and act as a State nodal organisation for user agencies.",
        icon: "building",
        buttonLabel: "Read Objectives",
        buttonPath: "/objectives",
      },
      {
        key: "implementation",
        title: "Implementation",
        summary:
          "Projects are implemented through in-house research schemes and user-department assignments from State, national, and international agencies.",
        details:
          "Use remote sensing with conventional techniques for optimum natural-resource management.\nCarry out ongoing research and development schemes within the Centre.\nUndertake applied projects requested by user departments and agencies.",
        icon: "clipboard",
        buttonLabel: "View Implementation",
        buttonPath: "/implementation",
      },
      {
        key: "approach",
        title: "Approach",
        summary:
          "RSAC-UP works as an interface between high technology and end users so geospatial information becomes usable for public planning.",
        details:
          "Integrate multi-stage remote sensing with conventional technologies.\nProvide accurate natural-resource information in multi-temporal mode.\nSupport effective technology dissemination to departments and field users.",
        icon: "route",
        buttonLabel: "View Approach",
        buttonPath: "/approach",
      },
      {
        key: "sphere-of-activities",
        title: "Sphere of Activities",
        summary:
          "Applications cover water, soil, forest, landuse, urban surveys, earth resources, agriculture, environment, and integrated natural-resource studies.",
        details:
          "Water resources, groundwater, flood mapping, wetlands and river dynamics.\nSoil, forest, landuse, urban planning, agriculture, horticulture and ecological studies.\nIntegrated natural-resource planning, training, mapping, and decision-support systems.",
        icon: "activity",
        buttonLabel: "View Activities",
        buttonPath: "/sphere-of-activities",
      },
      {
        key: "mobile-apps",
        title: "Mobile Apps",
        summary:
          "Download RSAC-UP mobile applications for staff workflows, field survey, corridor survey, orchard mapping, and crop-disease support.",
        details:
          "HRMS and survey applications are available from the Geo-Portal section.\nFiles should be uploaded in CMS Downloads so the website does not depend on external RSAC links.",
        icon: "phone",
        buttonLabel: "Open Mobile Apps",
        buttonPath: "/mobile-apps",
      },
    ],
    leadershipUpdates: {
      leadershipEyebrow: "Leadership",
      leadershipTitle: "Leadership and governance",
      updatesEyebrow: "Public Updates",
      updatesTitle: "Notices and circulars",
      pauseLabel: "Pause updates",
      playLabel: "Play updates",
      attribution: "RSAC-UP",
    },
    geoportals: {
      eyebrow: "Geo-Portal Services",
      title: "Direct access to planning and satellite-data services",
      description:
        "These service links support infrastructure planning, satellite-data viewing, education access mapping, geospatial data discovery, and RSAC-UP applications.",
      actionLabel: "Open Portal",
    },
  },
  about: {
    eyebrow: "About RSAC",
    title: "A state centre built around real satellite applications",
    body:
      "Remote Sensing Applications Centre, Uttar Pradesh was established at Lucknow in May 1982. The Centre works as an interface between remote sensing technology and user departments, converting satellite data, GIS, GPS and image-processing workflows into practical planning and monitoring support.",
    capabilities: [
      {
        title: "Operational divisions",
        text: "Agriculture, earth resources, forests, water, soil, landuse, training, and related scientific divisions.",
        icon: "satellite",
      },
      {
        title: "Geo-Spatial Data Bank",
        text: "Spatial repositories, image processing, mapping, application development, and technical support.",
        icon: "layers",
      },
      {
        title: "Advanced facilities",
        text: "Geoinformatics, cartography, laboratories, LiDAR, bathymetry, and training infrastructure.",
        icon: "ruler",
      },
    ],
    snapshotEyebrow: "Institution Snapshot",
    snapshotTitle: "Remote sensing for public departments",
    facts: [
      { label: "Established", value: "May 1982" },
      { label: "Location", value: "Lucknow" },
      {
        label: "Institutional Role",
        value: "First State Remote Sensing Applications Centre",
      },
    ],
    note:
      "RSAC-UP also provides training in remote sensing and GIS for government officials, faculty members, researchers, and students.",
  },
  location: {
    eyebrow: "Find the Centre",
    eyebrowSize: "normal",
    // Title + intro intentionally blank (removed from the site). Blanking the
    // baked default too stops the old text flashing during the CMS load window.
    // Set these in the Website Text Editor if the copy is ever wanted back.
    title: "",
    intro: "",
    cardEyebrow: "Visit RSAC-UP",
    cardEyebrowSize: "large",
    locality: "Jankipuram, Lucknow",
    address:
      "Sector G, Jankipuram, Kursi Road, Lucknow, Uttar Pradesh 226021",
    mapQuery:
      "Remote Sensing Applications Centre, Sector G, Jankipuram, Kursi Road, Lucknow, Uttar Pradesh 226021",
    directionsLabel: "Directions",
  },
  footer: {
    ecosystemEyebrow: "Scientific Ecosystem",
    ecosystemTitle: "Related Institutions",
    relatedLinks: [
      { name: "ISRO", url: "https://www.isro.gov.in" },
      { name: "NRSC", url: "https://www.nrsc.gov.in" },
      { name: "Space Applications Centre (SAC)", url: "https://www.sac.gov.in/" },
      { name: "Survey of India", url: "https://surveyofindia.gov.in" },
      { name: "CST Uttar Pradesh", url: "https://cst.up.gov.in" },
    ],
    policyLinks: [
      { name: "Terms & Conditions", path: "/terms-and-conditions" },
      { name: "Privacy Policy", path: "/privacy-policy" },
      { name: "Copyright Policy", path: "/copyright-policy" },
      { name: "Hyperlinking Policy", path: "/hyperlinking-policy" },
      { name: "Disclaimer", path: "/disclaimer" },
      { name: "Accessibility Statement", path: "/accessibility-statement" },
      { name: "Help", path: "/help" },
    ],
    ownership:
      "This is the official website of Remote Sensing Applications Centre, Uttar Pradesh. Content is published and managed by RSAC-UP.",
    // Real build date (replaced by Vite at build); CMS date_updated overrides it.
    reviewDate: __APP_BUILD_DATE__,
    reviewLabel: __APP_BUILD_DATE__,
    visitorCountLabel: "Total Visitor Count",
    visitorCountUnavailable: "Not available",
    assuranceText: "Accessibility and security reviews are ongoing",
    poweredBy: "Powered by RSAC-UP",
    socialHeading: "Follow Us",
    socialLinks: [
      {
        name: "Facebook",
        icon: "facebook",
        url: "https://www.facebook.com/Remote-Sensing-Applications-Centre-UP-Sector-G-Jankipuram-Lucknow-147411859175251",
      },
      {
        name: "Twitter",
        icon: "twitter",
        url: "https://x.com/rsac_up",
      },
    ],
    statutoryLinks: [],
    webInformationManagerLabel: "Web Information Manager",
  },
  search: {
    title: "Search RSAC-UP",
    subtitle: "Pages, profiles, divisions, facilities, academics, and portals.",
    placeholder: "Type a name, division, facility, PDF topic, or portal",
    inputLabel:
      "Search divisions, scientists, facilities, academics and geo-portals",
    quickLinksLabel: "Quick Links",
    resultsLabel: "Search Results",
    foundSuffix: "found",
    minCharsHint: "Type at least 2 characters for site search.",
    emptyTitle: "No matching result found.",
    emptyHint:
      "Try searching for GIS, agriculture, water, training, disaster, or remote sensing.",
    languageLabels: { primary: "हिं", secondary: "EN" },
    quickLinks: [
      {
        title: "Scientific Manpower",
        description:
          "Scientist profiles with employee IDs and division details.",
        path: "/about-us/scientific-manpower",
        type: "People",
      },
      {
        title: "Divisions",
        description:
          "Scientific divisions, projects, reports, maps, and manpower.",
        path: "/divisions",
        type: "Section",
      },
      {
        title: "Facilities",
        description:
          "Labs, data bank, library, hostel, LiDAR, and service block.",
        path: "/facilities",
        type: "Section",
      },
      {
        title: "Geo-Portals",
        description:
          "PM Gati Shakti, Bhuvan, NGDR, VEDAS, Samvedan and related services.",
        path: "/geoportals",
        type: "Services",
      },
    ],
    institutionalItems: [
      {
        title: "Our Formers",
        description: "Former chairmen, directors, and scientists.",
        path: "/about-us/our-formers",
        type: "Institution",
        keywords: [
          "former",
          "formers",
          "chairman",
          "director",
          "scientist",
          "governing body",
        ],
      },
      {
        title: "About RSAC-UP",
        description: "Established at Lucknow in May 1982.",
        path: "/about-us/read-more-about-us",
        type: "Institution",
        keywords: ["about", "established", "lucknow", "1982", "remote sensing"],
      },
      {
        title: "Organisational Chart",
        description: "Official organisational structure of RSAC-UP.",
        path: "/organisation-chart",
        type: "Institution",
        keywords: [
          "organisation",
          "organization",
          "chart",
          "structure",
          "hierarchy",
        ],
      },
      {
        title: "Training Programmes",
        description: "Remote sensing and GIS training programmes.",
        path: "/academics/training-division-",
        type: "Training",
        keywords: ["training", "capacity building", "students", "officials"],
      },
      {
        title: "Remote Sensing, GIS, GPS",
        description: "Core technology areas used by RSAC-UP.",
        path: "/divisions",
        type: "Capability",
        keywords: [
          "satellite",
          "remote sensing",
          "gis",
          "gps",
          "image processing",
        ],
      },
    ],
  },
  ui: {
    skipToContent: "Skip to main content",
    skipToContentShort: "Skip to Content",
    openSearch: "Open site search",
    searchButtonLabel: "Search site",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    backToTop: "Back to top",
    scrollHint: "Scroll to explore",
    displayOptions: "Display options",
    menuHeading: "Explore RSAC-UP",
    menuHint: "Select a domain to reveal its pages",
    menuSelectedDomain: "Selected domain",
    menuOpenSection: "Open section",
    menuCurrentPage: "Current page",
    menuDestinations: "destinations",
  },
  cards: {
    additionalInformation: "Additional Information",
    profileDetails: "Profile Details",
    profileFallback: "Profile",
  },
  organisationChart: {
    image: "/organisation-chart.jpg",
    downloadName: "RSAC-UP-Organisational-Chart.jpg",
    sourceUrl: "https://rsac.up.gov.in/en/page/organisational-chart",
    intro:
      "Governance and executive structure of the Remote Sensing Applications Centre, Uttar Pradesh — from the General Body chaired by the Hon'ble Chief Minister to the scientific divisions and support functions.",
    tiers: {
      generalBody: {
        badge: "General Body",
        president: {
          name: "Shri Yogi Adityanath",
          role: "Hon'ble Chief Minister, Uttar Pradesh",
          post: "President, General Body (ex-officio)",
          photo: "/organisation-chart-photos/chief-minister.jpg",
        },
        members: [
          {
            name: "Shri Anil Kumar",
            role: "Hon'ble Minister, Department of Science & Technology, U.P.",
            post: "Vice President, General Body (ex-officio)",
            photo: "/organisation-chart-photos/minister.jpg",
          },
          {
            name: "Shri Ajit Singh Pal",
            role: "Hon'ble Minister of State, Department of Science & Technology, U.P.",
            post: "Vice President, General Body (ex-officio)",
            photo: "/organisation-chart-photos/minister-of-state.jpg",
          },
        ],
      },
      governingBody: {
        badge: "Governing Body",
        chairman: {
          name: "Shri Pandhari Yadav",
          role: "Principal Secretary, Department of Science & Technology, Government of U.P.",
          post: "Chairman, Governing Body (ex-officio)",
          photo: "/organisation-chart-photos/principal-secretary.jpg",
        },
      },
      executive: {
        badge: "Executive",
        director: {
          name: "Shri Ramesh Chandra",
          role: "IAS, Special Secretary, Department of Science & Technology, Government of U.P.",
          post: "Director & Member Secretary, General Body and Governing Body",
          photo: "/organisation-chart-photos/director.jpg",
        },
      },
      divisions: {
        badge: "Scientific Divisions",
        items: [
          { title: "Agriculture Resources Division", head: "Shri Narendra Kumar", designation: "Scientist-SE", post: "(Head)" },
          { title: "Computer Image Processing Division", head: "Shri Sushil Chandra", designation: "Scientist-SF", post: "(Head)" },
          { title: "Earth Resources Division", head: "Dr. A. Uniyal", designation: "Scientist-SE", post: "(Head)" },
          { title: "Forest Resources & Ecology Division", head: "Shri Anil Kumar", designation: "Scientist-SE", post: "(Head)" },
          { title: "Geo-Spatial Data Bank Division", head: "Dr. P.P.S. Yadav", designation: "Scientist-SD", post: "(Head)" },
          { title: "Groundwater Resources Division", head: "Shri Arjun Singh", designation: "Scientist-SD", post: "(Head)" },
          { title: "Landuse & Urban Survey Division", head: "Shri Alok Saini", designation: "Scientist-SC", post: "(Head)" },
          { title: "School of Geo-Informatics", head: "Dr. Sudhakar Shukla", designation: "Scientist-SE", post: "(Head)" },
          { title: "Soil Resources Division", head: "Dr. M. S. Yadav", designation: "Scientist-SE", post: "(Head)" },
          { title: "Surface Water Resources Division", head: "Shri S.K.S. Yadav", designation: "Scientist-SE", post: "(Head)" },
          { title: "Training Division", head: "Shri Amit Sinha", designation: "Scientist-SE", post: "(Head)" },
        ],
      },
      support: {
        badge: "Support Functions",
        items: [
          {
            title: "Administration",
            head: "Smt. Sweta Pal / Shri Daya Shankar",
            designation: "Administrative Officer",
          },
          {
            title: "Technical Secretary to Director",
            head: "Dr. A. Uniyal",
            designation: "Additional Charge",
          },
          {
            title: "Accounts",
            head: "Shri Ravi Prakash Singh",
            designation: "Account Officer, Additional Charge",
          },
        ],
      },
    },
  },
  accessibility: {
    screenReaders: [
      {
        name: "Non Visual Desktop Access (NVDA)",
        website: "https://www.nvaccess.org/download/",
        type: "Free",
      },
      {
        name: "JAWS",
        website: "https://www.freedomscientific.com/products/software/jaws/",
        type: "Commercial",
      },
      {
        name: "Narrator",
        website:
          "https://support.microsoft.com/windows/complete-guide-to-narrator",
        type: "Built in",
      },
      {
        name: "VoiceOver",
        website: "https://support.apple.com/guide/voiceover/welcome/mac",
        type: "Built in",
      },
    ],
  },
  pageContent: {
    notices: {
      eyebrow: "Public Information",
      title: "Notices & Circulars",
      intro:
        "Official advertisements, circulars, and downloadable public notices published by RSAC-UP.",
      backLabel: "Back to Home",
      columns: { serial: "S.No.", category: "Category", notice: "Notice", action: "Action" },
    },
    contact: {
      eyebrow: "Contact",
      title: "Contact RSAC-UP",
      intro:
        "Official contact information for the Director office, training enquiries, project work, dissertation support, and the M.Tech. programme.",
      backLabel: "Back to Home",
      mobileAppsHeading: "Mobile Apps",
      mobileAppsIntro:
        "Download mobile applications developed by RSAC-UP. APK files install on Android devices.",
      downloadLabel: "Download",
      unavailableLabel: "Local copy unavailable",
    },
    quickAccess: {
      eyebrow: "Quick Access",
      title: "Jump straight to the most-used pages",
      openLabel: "Open",
    },
    gallery: {
      eyebrow: "Photo Gallery",
      title: "RSAC-UP in Pictures",
      intro:
        "Photographs of RSAC-UP events, training programmes, field surveys, and facilities.",
      emptyText: "Gallery images will be published here soon.",
      backLabel: "Back to Home",
      actionLabel: "View all photos",
      imageAlt: "Gallery image",
    },
    geoportals: {
      eyebrow: "Geo-Portal Services",
      title: "Planning, Satellite Data, and Geospatial Service Access",
      intro:
        "A focused service directory for infrastructure planning, satellite-data visualization, education access mapping, national geospatial data discovery, and RSAC-UP applications.",
      backLabel: "Back to Home",
    },
    organisationChart: {
      eyebrow: "About RSAC-UP",
      title: "Organisational Chart",
      backLabel: "Back to About Us",
    },
    leadership: {
      eyebrow: "Institutional Leadership",
      title: "Leadership and Governance",
      intro:
        "Official RSAC-UP leadership connects the Centre with the Government of Uttar Pradesh, Department of Science and Technology, and centre-level programme delivery.",
      backLabel: "Back to People",
    },
    scientists: {
      eyebrow: "Scientific Manpower",
      title: "Scientists and Domain Experts",
      backLabel: "Back to People",
    },
    technicalStaff: {
      eyebrow: "Technical Staff",
      title: "Technical and Facility Support",
      backLabel: "Back to People",
    },
    administration: {
      eyebrow: "Administration",
      title: "Administrative Contacts",
      backLabel: "Back to People",
    },
    manpower: {
      eyebrow: "Manpower",
      title: "RSAC-UP Manpower Structure",
      intro:
        "A compact overview of scientific, technical, administrative, and academic support capacity across RSAC-UP.",
      backLabel: "Back to Home",
    },
    screenReader: {
      eyebrow: "Accessibility",
      title: "Screen Reader Access",
      intro:
        "The website is structured to support assistive technologies and targets WCAG 2.1 Level AA and GIGW 3.0 accessibility requirements.",
      backLabel: "Back to Home",
    },
    sitemap: {
      eyebrow: "Sitemap",
      title: "",
      intro: "",
      sectionTitles: {
        primary: "Primary",
        aboutPeople: "About & People",
        divisions: "Divisions",
        facilities: "Facilities",
        academics: "Academics",
        publicInformation: "Public Information",
        policiesHelp: "Policies & Help",
      },
      primaryLinks: [
        { label: "Home", path: "/" },
        { label: "About Us", path: "/about-us" },
        { label: "Divisions", path: "/divisions" },
        { label: "Facilities", path: "/facilities" },
        { label: "Academics", path: "/academics" },
        { label: "Geo-Portals", path: "/geoportals" },
        { label: "Contact Us", path: "/contact" },
      ],
      peopleLinks: [
        { label: "About Us Overview", path: "/about-us/read-more-about-us" },
        { label: "Visitor's Book", path: "/about-us/en-visitors-book" },
        { label: "Our Formers", path: "/about-us/our-formers" },
        { label: "Organisational Chart", path: "/organisation-chart" },
        { label: "Scientific Manpower", path: "/about-us/scientific-manpower" },
        { label: "Administrative And Auxiliary Staff", path: "/about-us/administrative-and-auxiliary-staff" },
        { label: "Leadership", path: "/leadership" },
        { label: "Scientists", path: "/scientists" },
        { label: "Technical Staff", path: "/technical-staff" },
        { label: "Administration", path: "/administration" },
        { label: "Manpower", path: "/manpower" },
      ],
      allDivisionsLabel: "All Divisions",
      allFacilitiesLabel: "All Facilities",
      academicsLabel: "Academic Programmes",
      publicLinks: [
        { label: "Notices & Circulars", path: "/notices" },
        { label: "Flood Daily Reports", path: "/flood-reports" },
        { label: "Tenders & Procurement", path: "/tenders" },
        { label: "Right to Information (RTI)", path: "/rti" },
        { label: "Photo Gallery", path: "/gallery" },
        { label: "FAQ", path: "/faq" },
        { label: "Feedback", path: "/feedback" },
      ],
      screenReaderLabel: "Screen Reader Access",
      sitemapLabel: "Sitemap",
      backLabel: "Back to Sitemap",
    },
    placeholder: {
      eyebrow: "Signal lost",
      title: "Page Under Development",
      body:
        "The page you requested is not available or is still being prepared. Use the links below to continue, or search the site from the top bar.",
      links: [
        { label: "Homepage", path: "/", icon: "home" },
        { label: "Sitemap", path: "/sitemap", icon: "map" },
        { label: "Geo-Portal Services", path: "/geoportals", icon: "compass" },
        { label: "Contact RSAC-UP", path: "/contact", icon: "search" },
      ],
    },
    floodReports: {
      backLabel: "Back to Home",
      heading: "Daily flood reports",
      columns: { date: "Date", report: "Report", coverage: "Coverage", action: "Action" },
    },
    visionMission: {
      eyebrow: "Institutional Vision",
      title: "Vision & Mission",
      intro:
        "RSAC-UP applies geospatial science to strengthen public planning, natural-resource management, and resilient governance across Uttar Pradesh.",
      cards: [
        {
          label: "Vision",
          title: "Geospatial Intelligence for Sustainable Governance",
          text:
            "To establish RSAC-UP as a premier geospatial intelligence institution supporting scientific governance, sustainable development, natural resource management, disaster resilience, and spatial decision support systems across Uttar Pradesh.",
        },
        {
          label: "Mission",
          title: "Advanced Spatial Technologies for Public Good",
          text:
            "To utilize Remote Sensing, GIS, AI, LiDAR, Bathymetry, and spatial analytics for planning, monitoring, environmental intelligence, disaster management, agricultural assessment, urban development, and governance support systems.",
        },
      ],
    },
    ourFormers: {
      eyebrow: "About RSAC-UP",
      title: "Our Formers",
      intro:
        "A compact directory of former Governing Body chairmen, former directors, and former scientists.",
      backLabel: "Back to About Us",
      navigationLabel: "Our Formers sections",
      profilesLabel: "profiles",
      sections: [
        {
          slug: "our-chairman's-governing-body",
          title: "Former Chairmen, Governing Body",
          intro: "Former chairpersons and their tenure periods.",
        },
        {
          slug: "director's",
          title: "Former Directors",
          intro: "Former directors and their tenure periods.",
        },
        {
          slug: "our-former",
          title: "Former Scientists",
          intro: "Former scientist profiles with service and domain details.",
        },
      ],
    },
  },
  impactStats: [
    {
      value: "1982",
      label: "Year Established",
      detail: "India's first state remote sensing applications centre, set up at Lucknow.",
    },
    {
      value: "11",
      label: "Scientific Divisions",
      detail: "Agriculture, water, forest, soil, urban, earth resources, data bank, and geo-informatics.",
    },
    {
      value: "75+",
      label: "District Initiatives",
      detail: "Geospatial monitoring and decision-support programmes across Uttar Pradesh.",
    },
    {
      value: "100+",
      label: "Scientists & Experts",
      detail: "Active scientific, technical, and administrative staff at RSAC-UP.",
    },
    {
      value: "40+",
      label: "Active Projects",
      detail: "Ongoing satellite, GIS, and remote sensing research programmes.",
    },
    {
      value: "M.Tech.",
      label: "Academic Programme",
      detail: "In Remote Sensing and GIS, run by RSAC-UP since 2013, affiliated AKTU.",
    },
  ],
  impactStatsSection: {
    eyebrow: "Institution at a Glance",
    title: "Four decades of geospatial service to Uttar Pradesh",
    description:
      "Since 1982, RSAC-UP has built operational scientific programmes across the full spectrum of satellite remote sensing and GIS applications — from agriculture to disaster management.",
  },
  services: {
    eyebrow: "Services & Programmes",
    tabLabel: "Scientific Services",
    title: "Core services delivered to government departments",
    description:
      "RSAC-UP provides end-to-end geospatial services — from satellite data acquisition and interpretation to web-based decision-support systems — for planning and governance across Uttar Pradesh.",
    items: [
      {
        id: "remote-sensing",
        title: "Remote Sensing Applications",
        description:
          "Multi-sensor, multi-temporal satellite data analysis for resource mapping, change detection, and environmental monitoring.",
        icon: "satellite",
      },
      {
        id: "gis-mapping",
        title: "GIS Mapping & Spatial Analysis",
        description:
          "Thematic mapping, spatial modelling, and geodatabase development for evidence-based planning.",
        icon: "map",
      },
      {
        id: "data-interpretation",
        title: "Satellite Data Interpretation",
        description:
          "Digital image processing, classification, and visual interpretation of optical and microwave imagery.",
        icon: "scan",
      },
      {
        id: "nrm",
        title: "Natural Resource Management",
        description:
          "Integrated assessment of land, water, forest, and soil resources for sustainable utilisation.",
        icon: "trees",
      },
      {
        id: "agriculture",
        title: "Agriculture & Crop Monitoring",
        description:
          "Crop acreage, yield estimation, condition assessment, and seasonal agricultural intelligence.",
        icon: "sprout",
      },
      {
        id: "urban-planning",
        title: "Urban & Regional Planning",
        description:
          "Settlement mapping, urban growth analysis, and infrastructure planning support using high-resolution data.",
        icon: "building2",
      },
      {
        id: "water-resources",
        title: "Water Resources Assessment",
        description:
          "Surface water, groundwater prospect, watershed, and water-quality studies for resource planning.",
        icon: "droplets",
      },
      {
        id: "disaster",
        title: "Disaster Risk & Vulnerability Mapping",
        description:
          "Flood, drought, and hazard zonation with damage assessment and geospatial response support.",
        icon: "shield",
      },
      {
        id: "webgis",
        title: "Web GIS & Decision Support Systems",
        description:
          "Geoportals, online dashboards, and decision-support tools that put spatial intelligence in users' hands.",
        icon: "layers",
      },
    ],
  },
  applications: {
    eyebrow: "Services & Programmes",
    tabLabel: "Operational Programmes",
    title: "Operational programmes across Uttar Pradesh",
    description:
      "Applied remote sensing and GIS projects executed for state departments, central agencies, and academic partners — covering the full spectrum of natural-resource and governance needs.",
    items: [
      {
        id: "lulc",
        title: "Land Use / Land Cover Mapping",
        category: "Earth Resources",
        description:
          "State-wide landuse and landcover classification supporting planning, monitoring, and change analysis.",
        icon: "layers",
      },
      {
        id: "crop-assessment",
        title: "Crop Monitoring & Agricultural Assessment",
        category: "Agriculture",
        description:
          "Crop-wise area and production estimation for wheat, paddy, mustard, potato, sugarcane, and pulses.",
        icon: "sprout",
      },
      {
        id: "wetland",
        title: "Wetland & Waterbody Mapping",
        category: "Water Resources",
        description:
          "Inventory and monitoring of wetlands and water bodies for conservation and resource planning.",
        icon: "droplets",
      },
      {
        id: "watershed",
        title: "Watershed & Natural Resource Planning",
        category: "Natural Resources",
        description:
          "Watershed delineation and integrated natural-resource development plans at micro and meso scales.",
        icon: "trees",
      },
      {
        id: "urban-growth",
        title: "Urban Growth & Infrastructure Analysis",
        category: "Urban Planning",
        description:
          "Spatial growth tracking, utility mapping, and infrastructure intelligence for urban governance.",
        icon: "building2",
      },
      {
        id: "disaster-vulnerability",
        title: "Disaster Vulnerability Mapping",
        category: "Disaster Management",
        description:
          "Flood and hazard vulnerability assessment with risk zonation for preparedness and mitigation.",
        icon: "shield",
      },
      {
        id: "sarus-crane",
        title: "Sarus Crane Habitat & Population Mapping",
        category: "Ecology",
        description:
          "Habitat assessment and population mapping of the State Bird using remote sensing and field surveys.",
        icon: "bird",
      },
      {
        id: "geoportal",
        title: "Geoportal & Web GIS Applications",
        category: "Decision Support",
        description:
          "Interactive geoportals and Web GIS platforms delivering spatial data services to departments and citizens.",
        icon: "globe",
      },
    ],
  },
};

export default siteSettings;
