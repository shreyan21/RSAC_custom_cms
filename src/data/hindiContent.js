import { hiTranslations } from "./translations";
import { uiLabelDefaults } from "./uiLabels";

const hasDevanagari = (value) =>
  typeof value === "string" && /[ऀ-ॿ]/.test(value);

// Merge the bundled src/data Hindi UNDER a CMS-localized value: any field the
// CMS already supplies in Hindi (Devanagari present) wins; every other field
// falls back to the bundled Hindi. This is the inverse of the usual fallback
// merge, so editor-typed translations.hi is shown and only gaps use src/data.
// Arrays merge index-wise (the Hindi files are authored parallel to the
// defaults) and keep extras from either side.
export const mergeHindiFallback = (base, fallback) => {
  if (Array.isArray(base) && Array.isArray(fallback)) {
    const length = Math.max(base.length, fallback.length);
    return Array.from({ length }, (_, i) => {
      if (i < base.length && i < fallback.length) {
        return mergeHindiFallback(base[i], fallback[i]);
      }
      return i < base.length ? base[i] : fallback[i];
    });
  }

  if (Array.isArray(base)) {
    return base.length ? base : fallback;
  }

  if (base && typeof base === "object") {
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
      return Object.keys({ ...fallback, ...base }).reduce((result, key) => {
        result[key] = mergeHindiFallback(base[key], fallback[key]);
        return result;
      }, {});
    }
    return base;
  }

  if (hasDevanagari(base)) {
    return base;
  }
  // An empty string in `base` is a deliberate clear from the CMS (the editor
  // blanked this text), so keep it empty instead of resurrecting the baked Hindi
  // fallback. `undefined` still means "field absent" → use the baked Hindi.
  if (base === "") {
    return base;
  }
  return fallback === undefined || fallback === null || fallback === ""
    ? base
    : fallback;
};

export const siteSettingsHindi = {
  // Hindi twin of siteSettings.interfaceLabels: pre-fills the "Hindi Text"
  // column of every Interface Labels row from the official term map.
  interfaceLabels: Object.fromEntries(
    Object.entries(uiLabelDefaults)
      .map(([slug, english]) => [slug, hiTranslations[english]])
      .filter(([, hindi]) => hasDevanagari(hindi))
  ),
  branding: {
    organisationName: "रिमोट सेंसिंग एप्लीकेशन्स सेंटर, उत्तर प्रदेश",
    shortName: "आरएसएसी-यूपी",
    subtitle:
      "विज्ञान एवं प्रौद्योगिकी विभाग, उत्तर प्रदेश शासन के अधीन एक स्वायत्तशासी संस्था",
  },
  hero: {
    title: "रिमोट सेंसिंग एप्लीकेशन्स सेंटर",
    accentTitle: "उत्तर प्रदेश",
    highlights: [
      "योजना, अनुश्रवण और प्राकृतिक संसाधन प्रबंधन के लिए उपग्रह प्रेक्षणों को विभागीय जीआईएस कार्यप्रवाह से जोड़ता है।",
      "कृषि, वन, जल, भू-उपयोग, नगरीय सर्वेक्षण और भू-स्थानिक डाटा बैंक में सुदूर संवेदन, जीआईएस, जीपीएस तथा प्रतिबिंब प्रसंस्करण का उपयोग करता है।",
    ],
    stats: [
      { label: "स्थापना", value: "1982" },
      { label: "राज्य केंद्र", value: "प्रथम" },
      { label: "मुख्यालय", value: "लखनऊ" },
    ],
    domains: [
      "कृषि संसाधन",
      "वन एवं पारिस्थितिकी",
      "भूजल अध्ययन",
      "बाढ़ मानचित्रण",
    ],
    primaryAction: {
      label: "जियो-पोर्टल सेवाएं",
      path: "/geoportals",
      icon: "map",
    },
    secondaryAction: {
      label: "दृष्टि एवं मिशन",
      path: "/vision",
      icon: "satellite",
    },
    capabilityTags: [
      { label: "बहु-स्तरीय शासन डाटा", icon: "layers" },
      { label: "वैज्ञानिक डाटा अवसंरचना", icon: "database" },
    ],
  },
  missionPulse: {
    eyebrow: "कार्य क्षेत्र",
    title: "उपग्रह संकेत से धरातल पर निर्णय तक",
    description:
      "आरएसएसी-यूपी के वैज्ञानिक प्रभाग बहु-संवेदी पृथ्वी अवलोकन डाटा को फसल पूर्वानुमान, जल आकलन, वन अनुश्रवण, नगरीय योजना और बाढ़ प्रतिक्रिया में बदलते हैं।",
    hint: "केंद्र द्वारा प्रदान की जाने वाली सेवाओं का संक्षिप्त विवरण देखने के लिए क्षेत्र चुनें।",
    panelHeading: "क्षेत्र विवरण",
    panelCloseLabel: "विवरण बंद करें",
    panelLinkLabel: "प्रभाग खोलें",
    cardViewLabel: "देखें",
    cardOpenLabel: "खोलें",
    primaryAction: {
      label: "वैज्ञानिक प्रभाग",
      path: "/divisions",
    },
    secondaryAction: {
      label: "जियो-पोर्टल खोलें",
      path: "/geoportals",
    },
    // Arrays merge index-wise with the CMS/default cards, so order must match;
    // id + path + icon stay so navigation and icons still work in Hindi.
    domains: [
      {
        id: "agriculture",
        label: "कृषि",
        detail: "मौसमी फसल आसूचना",
        icon: "sprout",
        tagline: "खाद्य सुरक्षा हेतु फसल आसूचना",
        deliverables: [
          "गेहूं, धान, गन्ना, आलू और सरसों के लिए फसल क्षेत्रफल एवं उत्पादन अनुमान",
          "फसल अवशेष जलाने की चेतावनी एवं बागवानी विस्तार मानचित्रण",
          "कृषि विभाग हेतु फसल-स्थिति एवं सूखा आकलन",
        ],
        stat: { value: "75", label: "जिलों में मौसमी फसल आकलन" },
        path: "/divisions/agriculture-resources-division1",
        linkLabel: "कृषि संसाधन प्रभाग",
      },
      {
        id: "water",
        label: "जल संसाधन",
        detail: "सतही एवं भूजल",
        icon: "droplets",
        tagline: "राज्य की योजना के हर जल बिंदु का मानचित्रण",
        deliverables: [
          "पेयजल योजनाओं हेतु भूजल संभाव्यता मानचित्र",
          "मौसमी अनुश्रवण सहित आर्द्रभूमि एवं जलाशय सूची",
          "सूक्ष्म एवं मध्यम स्तर पर जलसंभर विकास योजनाएं",
        ],
        stat: { value: "2", label: "समर्पित सतही एवं भूजल प्रभाग" },
        path: "/divisions/groundwater-resources-division1",
        linkLabel: "भूजल संसाधन प्रभाग",
      },
      {
        id: "forest",
        label: "वन एवं पारिस्थितिकी",
        detail: "पारिस्थितिकी एवं जैव विविधता",
        icon: "trees",
        tagline: "वनों, आर्द्रभूमियों एवं आवासों की निगरानी",
        deliverables: [
          "परिवर्तन पहचान सहित वन आवरण एवं सीमा मानचित्रण",
          "पर्यावरण-संवेदनशील क्षेत्र एवं जैव विविधता आकलन",
          "राज्य पक्षी हेतु सारस क्रेन आवास एवं जनसंख्या मानचित्रण",
        ],
        stat: { value: "1982", label: "से उत्तर प्रदेश की पारिस्थितिकी का अनुश्रवण" },
        path: "/divisions/forest-resources-ecology-division",
        linkLabel: "वन संसाधन एवं पारिस्थितिकी प्रभाग",
      },
      {
        id: "soil-land",
        label: "मृदा एवं भू-उपयोग",
        detail: "मृदा स्वास्थ्य एवं भू-आवरण",
        icon: "mountain",
        tagline: "मृदा संसाधन एवं भू-आवरण, वर्गीकृत",
        deliverables: [
          "राज्यव्यापी भू-उपयोग / भू-आवरण वर्गीकरण",
          "लवणता एवं क्षारीयता आकलन सहित मृदा संसाधन मानचित्रण",
          "बंजर भूमि पहचान एवं सुधार योजना इनपुट",
        ],
        stat: { value: "100%", label: "उत्तर प्रदेश का एलयूएलसी मानचित्रण के अंतर्गत" },
        path: "/divisions/soil-resources-division1",
        linkLabel: "मृदा संसाधन प्रभाग",
      },
      {
        id: "urban",
        label: "नगरीय एवं अवसंरचना",
        detail: "विकास एवं उपयोगिता मानचित्रण",
        icon: "building2",
        tagline: "उच्च-विभेदन प्रतिबिंब से नगर योजना",
        deliverables: [
          "मास्टर प्लान हेतु नगरीय विकास एवं विस्तार अनुश्रवण",
          "नगरीय शासन हेतु उपयोगिता एवं अवसंरचना मानचित्रण",
          "उच्च-विभेदन बस्ती एवं सुविधा मानचित्रण",
        ],
        stat: { value: "75+", label: "जिला एवं नगर योजना पहल" },
        path: "/divisions/landuse-amp;-urban-survey-division1",
        linkLabel: "भू-उपयोग एवं नगरीय सर्वेक्षण प्रभाग",
      },
      {
        id: "disaster",
        label: "आपदा एवं बाढ़",
        detail: "मानसून प्रतिक्रिया मानचित्रण",
        icon: "shield",
        tagline: "जब हर घंटा महत्वपूर्ण हो, बाढ़ आसूचना",
        deliverables: [
          "मानसून के दौरान दैनिक बाढ़ जलप्लावन मानचित्रण",
          "बाढ़ संकट क्षेत्र निर्धारण एवं घटना-पश्चात क्षति आकलन",
          "सूखा अनुश्रवण एवं संकट सुभेद्यता अध्ययन",
        ],
        stat: { value: "दैनिक", label: "मानसून ऋतु में बाढ़ रिपोर्ट" },
        path: "/flood-reports",
        linkLabel: "दैनिक बाढ़ रिपोर्ट",
      },
    ],
  },
  homeSections: {
    navigation: [
      { label: "मिशन", href: "#mission-pulse", icon: "orbit" },
      { label: "अपडेट", href: "#leadership-updates", icon: "radio" },
      { label: "परिचय", href: "#about-rsac", icon: "building" },
      { label: "सेवाएं", href: "#services", icon: "layers" },
      { label: "स्थान", href: "#visit-rsac", icon: "map" },
    ],
    leadershipUpdates: {
      leadershipEyebrow: "नेतृत्व",
      leadershipTitle: "नेतृत्व एवं प्रशासन",
      updatesEyebrow: "सार्वजनिक अपडेट",
      updatesTitle: "सूचनाएं एवं परिपत्र",
      pauseLabel: "अपडेट रोकें",
      playLabel: "अपडेट चलाएं",
      attribution: "आरएसएसी-यूपी",
    },
    geoportals: {
      eyebrow: "जियो-पोर्टल सेवाएं",
      title: "योजना और उपग्रह डाटा सेवाओं तक सीधी पहुंच",
      description:
        "ये सेवाएं अवसंरचना योजना, उपग्रह डाटा अवलोकन, शिक्षा पहुंच मानचित्रण और भू-स्थानिक डाटा खोज में सहायता करती हैं।",
      actionLabel: "पोर्टल खोलें",
    },
  },
  about: {
    eyebrow: "आरएसएसी के बारे में",
    title: "व्यावहारिक उपग्रह अनुप्रयोगों पर आधारित राज्य केंद्र",
    body:
      "सुदूर संवेदन उपयोग केंद्र, उत्तर प्रदेश की स्थापना मई 1982 में लखनऊ में हुई। केंद्र उपग्रह डाटा, जीआईएस, जीपीएस और प्रतिबिंब प्रसंस्करण को विभागीय योजना तथा अनुश्रवण में उपयोगी बनाता है।",
    capabilities: [
      {
        title: "संचालन प्रभाग",
        text: "कृषि, भू-संसाधन, वन, जल, मृदा, भू-उपयोग, प्रशिक्षण एवं संबंधित वैज्ञानिक प्रभाग।",
        icon: "satellite",
      },
      {
        title: "भू-स्थानिक डाटा बैंक",
        text: "स्थानिक भंडार, प्रतिबिंब प्रसंस्करण, मानचित्रण, अनुप्रयोग विकास एवं तकनीकी सहायता।",
        icon: "layers",
      },
      {
        title: "उन्नत सुविधाएं",
        text: "भू-सूचना विज्ञान, मानचित्रकला, प्रयोगशालाएं, लिडार, जल-गहराई मापन एवं प्रशिक्षण अवसंरचना।",
        icon: "ruler",
      },
    ],
    snapshotEyebrow: "संस्था परिचय",
    snapshotTitle: "शासकीय विभागों के लिए सुदूर संवेदन",
    facts: [
      { label: "स्थापना", value: "मई 1982" },
      { label: "स्थान", value: "लखनऊ" },
      { label: "संस्थागत भूमिका", value: "प्रथम राज्य सुदूर संवेदन उपयोग केंद्र" },
    ],
    note:
      "आरएसएसी-यूपी शासकीय अधिकारियों, शिक्षकों, शोधकर्ताओं और विद्यार्थियों को सुदूर संवेदन एवं जीआईएस प्रशिक्षण भी प्रदान करता है।",
  },
  location: {
    eyebrow: "केंद्र का स्थान",
    // Title + intro intentionally blank (removed from the site) so the old Hindi
    // text does not flash during the CMS load window. Empty here means the
    // baked Hindi fallback no longer supplies this copy.
    title: "",
    intro: "",
    cardEyebrow: "आरएसएसी-यूपी आएं",
    locality: "जानकीपुरम, लखनऊ",
    address:
      "सेक्टर जी, जानकीपुरम, कुर्सी रोड, लखनऊ, उत्तर प्रदेश 226021",
    directionsLabel: "दिशा-निर्देश",
  },
  footer: {
    ecosystemEyebrow: "वैज्ञानिक तंत्र",
    ecosystemTitle: "संबंधित संस्थान",
    socialHeading: "हमें फ़ॉलो करें",
    ownership:
      "यह सुदूर संवेदन उपयोग केंद्र, उत्तर प्रदेश की आधिकारिक वेबसाइट है। सामग्री का प्रकाशन एवं प्रबंधन आरएसएसी-यूपी द्वारा किया जाता है।",
    visitorCountLabel: "कुल आगंतुक संख्या",
    visitorCountUnavailable: "उपलब्ध नहीं",
    assuranceText: "सुगम्यता और सुरक्षा समीक्षा प्रगति पर है",
    poweredBy: "आरएसएसी-यूपी द्वारा संचालित",
    webInformationManagerLabel: "वेब सूचना प्रबंधक",
    relatedLinks: [
      { name: "इसरो", url: "https://www.isro.gov.in" },
      { name: "एनआरएससी", url: "https://www.nrsc.gov.in" },
      { name: "इंडिया-व्रिस", url: "https://indiawris.gov.in" },
      { name: "पीएम गतिशक्ति", url: "https://gati.gov.in" },
      { name: "भारतीय सर्वेक्षण विभाग", url: "https://surveyofindia.gov.in" },
      { name: "सीएसटी उत्तर प्रदेश", url: "https://cst.up.gov.in" },
    ],
    policyLinks: [
      { name: "नियम एवं शर्तें", path: "/terms-and-conditions" },
      { name: "गोपनीयता नीति", path: "/privacy-policy" },
      { name: "कॉपीराइट नीति", path: "/copyright-policy" },
      { name: "हाइपरलिंक नीति", path: "/hyperlinking-policy" },
      { name: "अस्वीकरण", path: "/disclaimer" },
      { name: "सुगम्यता वक्तव्य", path: "/accessibility-statement" },
      { name: "सहायता", path: "/help" },
    ],
    statutoryLinks: [
      {
        name: "भारत का राष्ट्रीय पोर्टल",
        url: "https://india.gov.in",
        external: true,
        icon: "external",
      },
      {
        name: "वेबसाइट नीतियां",
        url: "https://www.india.gov.in/my-government/citizens-charter",
        external: true,
        icon: "external",
      },
      {
        name: "स्क्रीन रीडर अभिगम",
        path: "/screen-reader-access",
        icon: "accessibility",
      },
      { name: "साइटमैप", path: "/sitemap" },
    ],
  },
  search: {
    title: "आरएसएसी-यूपी में खोजें",
    subtitle: "पृष्ठ, प्रोफाइल, प्रभाग, सुविधाएं, शिक्षण और पोर्टल।",
    placeholder: "नाम, प्रभाग, सुविधा, पीडीएफ विषय या पोर्टल लिखें",
    inputLabel: "वेबसाइट सामग्री खोजें",
    quickLinksLabel: "त्वरित लिंक",
    resultsLabel: "खोज परिणाम",
    foundSuffix: "मिले",
    minCharsHint: "खोज के लिए कम से कम 2 अक्षर लिखें।",
    emptyTitle: "कोई संबंधित परिणाम नहीं मिला।",
    emptyHint: "जीआईएस, कृषि, जल, प्रशिक्षण, आपदा या सुदूर संवेदन खोजें।",
    languageLabels: { primary: "हिं", secondary: "EN" },
    quickLinks: [
      {
        title: "वैज्ञानिक कार्मिक",
        description: "कर्मचारी आईडी और प्रभाग सहित वैज्ञानिक प्रोफाइल।",
        path: "/about-us/scientific-manpower",
        type: "कार्मिक",
      },
      {
        title: "प्रभाग",
        description: "वैज्ञानिक प्रभाग, परियोजनाएं, रिपोर्ट और मानचित्र।",
        path: "/divisions",
        type: "अनुभाग",
      },
      {
        title: "सुविधाएं",
        description: "प्रयोगशालाएं, डेटा बैंक, पुस्तकालय और छात्रावास।",
        path: "/facilities",
        type: "अनुभाग",
      },
      {
        title: "जियो-पोर्टल",
        description: "गतिशक्ति, भुवन और अन्य भू-स्थानिक सेवाएं।",
        path: "/geoportals",
        type: "सेवाएं",
      },
    ],
  },
  ui: {
    skipToContent: "मुख्य सामग्री पर जाएं",
    skipToContentShort: "मुख्य सामग्री पर जाएं",
    openSearch: "वेबसाइट खोज खोलें",
    searchButtonLabel: "खोजें",
    openMenu: "मेनू खोलें",
    closeMenu: "मेनू बंद करें",
    backToTop: "ऊपर जाएं",
    scrollHint: "आगे देखने के लिए स्क्रॉल करें",
    displayOptions: "प्रदर्शन विकल्प",
    menuHeading: "आरएसएसी-यूपी देखें",
    menuHint: "पृष्ठ देखने के लिए क्षेत्र चुनें",
    menuSelectedDomain: "चयनित क्षेत्र",
    menuOpenSection: "अनुभाग खोलें",
    menuCurrentPage: "वर्तमान पृष्ठ",
    menuDestinations: "गंतव्य",
    menuKeyboardHint: "अनुभाग बदलने के लिए तीर कुंजियों का उपयोग करें।",
  },
  cards: {
    additionalInformation: "अतिरिक्त जानकारी",
    profileDetails: "प्रोफाइल विवरण",
    profileFallback: "प्रोफाइल",
  },
  pageContent: {
    notices: {
      eyebrow: "जन सूचना",
      title: "सूचनाएं एवं परिपत्र",
      intro:
        "आरएसएसी-यूपी द्वारा प्रकाशित आधिकारिक विज्ञापन, परिपत्र और डाउनलोड योग्य जन सूचनाएं।",
      backLabel: "होम पर वापस जाएं",
      columns: { serial: "क्रम सं.", category: "श्रेणी", notice: "सूचना", action: "कार्रवाई" },
    },
    contact: {
      eyebrow: "संपर्क",
      title: "आरएसएसी-यूपी से संपर्क करें",
      intro:
        "निदेशक कार्यालय, प्रशिक्षण पूछताछ, परियोजना कार्य, शोध-प्रबंध सहायता और एम.टेक. कार्यक्रम हेतु आधिकारिक संपर्क जानकारी।",
      backLabel: "होम पर वापस जाएं",
      mobileAppsHeading: "मोबाइल ऐप्स",
      mobileAppsIntro:
        "आरएसएसी-यूपी द्वारा विकसित मोबाइल ऐप डाउनलोड करें। एपीके फाइलें एंड्रॉइड उपकरणों पर इंस्टॉल होती हैं।",
      downloadLabel: "डाउनलोड",
      unavailableLabel: "स्थानीय प्रति उपलब्ध नहीं",
    },
    quickAccess: {
      eyebrow: "त्वरित पहुंच",
      title: "सबसे अधिक उपयोग किए जाने वाले पृष्ठ सीधे खोलें",
      openLabel: "खोलें",
    },
    gallery: {
      eyebrow: "फोटो गैलरी",
      title: "तस्वीरों में आरएसएसी-यूपी",
      intro:
        "आरएसएसी-यूपी के कार्यक्रमों, प्रशिक्षण, क्षेत्र सर्वेक्षण और सुविधाओं की तस्वीरें।",
      emptyText: "गैलरी की तस्वीरें शीघ्र यहां प्रकाशित की जाएंगी।",
      backLabel: "होम पर वापस जाएं",
      actionLabel: "सभी तस्वीरें देखें",
      imageAlt: "गैलरी चित्र",
    },
    geoportals: {
      eyebrow: "जिओ-पोर्टल सेवाएं",
      title: "योजना, उपग्रह डाटा और भू-स्थानिक सेवा पहुंच",
      intro:
        "अवसंरचना योजना, उपग्रह-डाटा विज़ुअलाइज़ेशन, शिक्षा पहुंच मानचित्रण, राष्ट्रीय भू-स्थानिक डाटा खोज और आरएसएसी-यूपी अनुप्रयोगों हेतु केंद्रित सेवा निर्देशिका।",
      backLabel: "होम पर वापस जाएं",
    },
    organisationChart: {
      eyebrow: "आरएसएसी-यूपी के बारे में",
      title: "संगठनात्मक चार्ट",
      backLabel: "हमारे बारे में वापस जाएं",
    },
    leadership: {
      eyebrow: "संस्थागत नेतृत्व",
      title: "नेतृत्व एवं शासन",
      intro:
        "आरएसएसी-यूपी का आधिकारिक नेतृत्व केंद्र को उत्तर प्रदेश सरकार, विज्ञान एवं प्रौद्योगिकी विभाग और केंद्र-स्तरीय कार्यक्रम क्रियान्वयन से जोड़ता है।",
      backLabel: "कार्मिक पर वापस जाएं",
    },
    scientists: {
      eyebrow: "वैज्ञानिक कार्मिक",
      title: "वैज्ञानिक एवं क्षेत्र विशेषज्ञ",
      backLabel: "कार्मिक पर वापस जाएं",
    },
    technicalStaff: {
      eyebrow: "तकनीकी कर्मचारी",
      title: "तकनीकी एवं सुविधा सहायता",
      backLabel: "कार्मिक पर वापस जाएं",
    },
    administration: {
      eyebrow: "प्रशासन",
      title: "प्रशासनिक संपर्क",
      backLabel: "कार्मिक पर वापस जाएं",
    },
    manpower: {
      eyebrow: "कार्मिक",
      title: "आरएसएसी-यूपी कार्मिक संरचना",
      intro:
        "आरएसएसी-यूपी में वैज्ञानिक, तकनीकी, प्रशासनिक और शैक्षणिक सहायता क्षमता का संक्षिप्त अवलोकन।",
      backLabel: "होम पर वापस जाएं",
    },
    screenReader: {
      eyebrow: "सुगम्यता",
      title: "स्क्रीन रीडर एक्सेस",
      intro:
        "वेबसाइट सहायक तकनीकों के अनुकूल संरचित है और WCAG 2.1 स्तर AA तथा GIGW 3.0 सुगम्यता आवश्यकताओं को लक्षित करती है।",
      backLabel: "होम पर वापस जाएं",
    },
    sitemap: {
      eyebrow: "साइटमैप",
      title: "",
      intro: "",
      sectionTitles: {
        primary: "प्रमुख पृष्ठ",
        aboutPeople: "परिचय एवं कार्मिक",
        divisions: "प्रभाग",
        facilities: "सुविधाएं",
        academics: "शैक्षणिक कार्यक्रम",
        publicInformation: "जन सूचना",
        policiesHelp: "नीतियां एवं सहायता",
      },
      primaryLinks: [
        { label: "मुखपृष्ठ", path: "/" },
        { label: "हमारे बारे में", path: "/about-us" },
        { label: "प्रभाग", path: "/divisions" },
        { label: "सुविधाएं", path: "/facilities" },
        { label: "शैक्षणिक कार्यक्रम", path: "/academics" },
        { label: "जिओ-पोर्टल", path: "/geoportals" },
        { label: "संपर्क करें", path: "/contact" },
      ],
      peopleLinks: [
        { label: "परिचय", path: "/about-us/read-more-about-us" },
        { label: "आगंतुक पुस्तिका", path: "/about-us/en-visitors-book" },
        { label: "हमारे पूर्व पदाधिकारी", path: "/about-us/our-formers" },
        { label: "संगठनात्मक चार्ट", path: "/organisation-chart" },
        { label: "वैज्ञानिक कार्मिक", path: "/about-us/scientific-manpower" },
        { label: "प्रशासनिक एवं सहायक कर्मचारी", path: "/about-us/administrative-and-auxiliary-staff" },
        { label: "नेतृत्व", path: "/leadership" },
        { label: "वैज्ञानिक", path: "/scientists" },
        { label: "तकनीकी कर्मचारी", path: "/technical-staff" },
        { label: "प्रशासन", path: "/administration" },
        { label: "कार्मिक", path: "/manpower" },
      ],
      allDivisionsLabel: "सभी प्रभाग",
      allFacilitiesLabel: "सभी सुविधाएं",
      academicsLabel: "शैक्षणिक कार्यक्रम",
      publicLinks: [
        { label: "सूचनाएं एवं परिपत्र", path: "/notices" },
        { label: "दैनिक बाढ़ रिपोर्ट", path: "/flood-reports" },
        { label: "निविदाएं एवं खरीद", path: "/tenders" },
        { label: "सूचना का अधिकार", path: "/rti" },
        { label: "फोटो गैलरी", path: "/gallery" },
        { label: "सामान्य प्रश्न", path: "/faq" },
        { label: "प्रतिक्रिया", path: "/feedback" },
      ],
      screenReaderLabel: "स्क्रीन रीडर एक्सेस",
      sitemapLabel: "साइटमैप",
      backLabel: "साइटमैप पर वापस जाएं",
    },
    placeholder: {
      eyebrow: "पृष्ठ उपलब्ध नहीं",
      title: "पृष्ठ निर्माणाधीन है",
      body:
        "आपके द्वारा मांगा गया पृष्ठ उपलब्ध नहीं है या अभी तैयार किया जा रहा है। आगे बढ़ने के लिए नीचे दिए गए लिंक का उपयोग करें।",
      links: [
        { label: "मुखपृष्ठ", path: "/", icon: "home" },
        { label: "साइटमैप", path: "/sitemap", icon: "map" },
        { label: "जिओ-पोर्टल सेवाएं", path: "/geoportals", icon: "compass" },
        { label: "आरएसएसी-यूपी से संपर्क करें", path: "/contact", icon: "search" },
      ],
    },
    floodReports: {
      backLabel: "होम पर वापस जाएं",
      heading: "दैनिक बाढ़ रिपोर्ट",
      columns: { date: "तिथि", report: "रिपोर्ट", coverage: "कवरेज", action: "कार्रवाई" },
    },
    visionMission: {
      eyebrow: "संस्थागत दृष्टि",
      title: "दृष्टि एवं मिशन",
      intro:
        "आरएसएसी-यूपी उत्तर प्रदेश में लोक योजना, प्राकृतिक संसाधन प्रबंधन और सुदृढ़ शासन के लिए भू-स्थानिक विज्ञान का उपयोग करता है।",
    },
    ourFormers: {
      eyebrow: "आरएसएसी-यूपी के बारे में",
      title: "हमारे पूर्व",
      intro:
        "पूर्व शासी निकाय अध्यक्षों, पूर्व निदेशकों और पूर्व वैज्ञानिकों की निर्देशिका।",
      backLabel: "हमारे बारे में वापस जाएं",
      navigationLabel: "पूर्व पदाधिकारी अनुभाग",
      profilesLabel: "प्रोफाइल",
    },
  },
  impactStats: [
    {
      value: "1982",
      label: "स्थापना वर्ष",
      detail: "लखनऊ में स्थापित भारत का प्रथम राज्य सुदूर संवेदन उपयोग केंद्र।",
    },
    {
      value: "11",
      label: "वैज्ञानिक प्रभाग",
      detail: "कृषि, जल, वन, मृदा, नगरीय, भू-संसाधन, डाटा बैंक एवं भू-सूचना विज्ञान।",
    },
    {
      value: "75+",
      label: "जिला पहल",
      detail: "उत्तर प्रदेश में भू-स्थानिक अनुश्रवण एवं निर्णय सहायता कार्यक्रम।",
    },
    {
      value: "100+",
      label: "वैज्ञानिक एवं विशेषज्ञ",
      detail: "आरएसएसी-यूपी में सक्रिय वैज्ञानिक, तकनीकी एवं प्रशासनिक कर्मी।",
    },
    {
      value: "40+",
      label: "सक्रिय परियोजनाएं",
      detail: "चालू उपग्रह, जीआईएस एवं सुदूर संवेदन शोध कार्यक्रम।",
    },
    {
      value: "M.Tech.",
      label: "शैक्षणिक कार्यक्रम",
      detail: "सुदूर संवेदन एवं जीआईएस में, 2013 से आरएसएसी-यूपी द्वारा संचालित, एकेटीयू से संबद्ध।",
    },
  ],
  services: {
    eyebrow: "सेवाएं एवं कार्यक्रम",
    tabLabel: "वैज्ञानिक सेवाएं",
    title: "शासकीय विभागों को दी जाने वाली प्रमुख सेवाएं",
    description:
      "आरएसएसी-यूपी उपग्रह डाटा प्राप्ति और विश्लेषण से लेकर वेब आधारित निर्णय सहायता प्रणाली तक संपूर्ण भू-स्थानिक सेवाएं प्रदान करता है।",
    items: [
      {
        id: "remote-sensing",
        title: "सुदूर संवेदन अनुप्रयोग",
        description:
          "संसाधन मानचित्रण, परिवर्तन पहचान एवं पर्यावरण अनुश्रवण हेतु बहु-संवेदक, बहु-कालिक उपग्रह डाटा विश्लेषण।",
        icon: "satellite",
      },
      {
        id: "gis-mapping",
        title: "जीआईएस मानचित्रण एवं स्थानिक विश्लेषण",
        description:
          "प्रमाण आधारित योजना हेतु विषयगत मानचित्रण, स्थानिक प्रतिरूपण एवं भू-डाटाबेस विकास।",
        icon: "map",
      },
      {
        id: "data-interpretation",
        title: "उपग्रह डाटा विवेचन",
        description:
          "ऑप्टिकल एवं माइक्रोवेव प्रतिबिंबों का अंकीय प्रसंस्करण, वर्गीकरण एवं दृश्य विवेचन।",
        icon: "scan",
      },
      {
        id: "nrm",
        title: "प्राकृतिक संसाधन प्रबंधन",
        description:
          "सतत उपयोग हेतु भूमि, जल, वन एवं मृदा संसाधनों का समेकित आकलन।",
        icon: "trees",
      },
      {
        id: "agriculture",
        title: "कृषि एवं फसल अनुश्रवण",
        description:
          "फसल क्षेत्रफल, उपज आकलन, स्थिति मूल्यांकन एवं मौसमी कृषि आसूचना।",
        icon: "sprout",
      },
      {
        id: "urban-planning",
        title: "नगरीय एवं क्षेत्रीय योजना",
        description:
          "उच्च विभेदन डाटा से बस्ती मानचित्रण, नगरीय विकास विश्लेषण एवं अवसंरचना योजना सहायता।",
        icon: "building2",
      },
      {
        id: "water-resources",
        title: "जल संसाधन आकलन",
        description:
          "संसाधन योजना हेतु सतही जल, भूजल संभाव्यता, जलग्रहण एवं जल-गुणवत्ता अध्ययन।",
        icon: "droplets",
      },
      {
        id: "disaster",
        title: "आपदा जोखिम एवं सुभेद्यता मानचित्रण",
        description:
          "बाढ़, सूखा एवं संकट क्षेत्र निर्धारण के साथ क्षति आकलन एवं भू-स्थानिक प्रतिक्रिया सहायता।",
        icon: "shield",
      },
      {
        id: "webgis",
        title: "वेब जीआईएस एवं निर्णय सहायता प्रणाली",
        description:
          "जियोपोर्टल, ऑनलाइन डैशबोर्ड एवं निर्णय सहायता उपकरण जो स्थानिक आसूचना उपयोगकर्ताओं तक पहुंचाते हैं।",
        icon: "layers",
      },
    ],
  },
  applications: {
    eyebrow: "सेवाएं एवं कार्यक्रम",
    tabLabel: "संचालन कार्यक्रम",
    title: "उत्तर प्रदेश में संचालित कार्यक्रम",
    description:
      "राज्य विभागों, केंद्रीय अभिकरणों एवं शैक्षणिक भागीदारों के लिए संचालित अनुप्रयुक्त सुदूर संवेदन एवं जीआईएस परियोजनाएं — प्राकृतिक संसाधन एवं शासन आवश्यकताओं की पूरी श्रृंखला सहित।",
    items: [
      {
        id: "lulc",
        title: "भू-उपयोग / भू-आवरण मानचित्रण",
        category: "भू-संसाधन",
        description:
          "योजना, अनुश्रवण एवं परिवर्तन विश्लेषण हेतु राज्यव्यापी भू-उपयोग एवं भू-आवरण वर्गीकरण।",
        icon: "layers",
      },
      {
        id: "crop-assessment",
        title: "फसल अनुश्रवण एवं कृषि आकलन",
        category: "कृषि",
        description:
          "गेहूं, धान, सरसों, आलू, गन्ना एवं दलहन हेतु फसलवार क्षेत्रफल एवं उत्पादन आकलन।",
        icon: "sprout",
      },
      {
        id: "wetland",
        title: "आर्द्रभूमि एवं जलाशय मानचित्रण",
        category: "जल संसाधन",
        description:
          "संरक्षण एवं संसाधन योजना हेतु आर्द्रभूमियों एवं जल निकायों की सूची एवं अनुश्रवण।",
        icon: "droplets",
      },
      {
        id: "watershed",
        title: "जलग्रहण एवं प्राकृतिक संसाधन योजना",
        category: "प्राकृतिक संसाधन",
        description:
          "सूक्ष्म एवं मध्य स्तर पर जलग्रहण सीमांकन एवं समेकित प्राकृतिक संसाधन विकास योजनाएं।",
        icon: "trees",
      },
      {
        id: "urban-growth",
        title: "नगरीय विकास एवं अवसंरचना विश्लेषण",
        category: "नगरीय योजना",
        description:
          "नगरीय शासन हेतु स्थानिक विकास अनुश्रवण, उपयोगिता मानचित्रण एवं अवसंरचना आसूचना।",
        icon: "building2",
      },
      {
        id: "disaster-vulnerability",
        title: "आपदा सुभेद्यता मानचित्रण",
        category: "आपदा प्रबंधन",
        description:
          "तैयारी एवं न्यूनीकरण हेतु बाढ़ एवं संकट सुभेद्यता आकलन तथा जोखिम क्षेत्र निर्धारण।",
        icon: "shield",
      },
      {
        id: "sarus-crane",
        title: "सारस आवास एवं जनसंख्या मानचित्रण",
        category: "पारिस्थितिकी",
        description:
          "सुदूर संवेदन एवं क्षेत्र सर्वेक्षण द्वारा राज्य पक्षी के आवास आकलन एवं जनसंख्या मानचित्रण।",
        icon: "bird",
      },
      {
        id: "geoportal",
        title: "जियोपोर्टल एवं वेब जीआईएस अनुप्रयोग",
        category: "निर्णय सहायता",
        description:
          "विभागों एवं नागरिकों को स्थानिक डाटा सेवाएं प्रदान करने वाले अन्तःक्रियात्मक जियोपोर्टल एवं वेब जीआईएस प्लेटफॉर्म।",
        icon: "globe",
      },
    ],
  },
  organisationChart: {
    intro:
      "सुदूर संवेदन उपयोग केंद्र, उत्तर प्रदेश की आधिकारिक प्रशासनिक और वैज्ञानिक संरचना।",
  },
};

const menuTranslations = {
  "/": {
    title: "होम",
    description: "मुखपृष्ठ और प्रमुख भू-स्थानिक सेवाएं।",
    links: {
      "/": ["होम", "आरएसएसी-यूपी मुखपृष्ठ पर जाएं।"],
      "/geoportals": ["जिओ-पोर्टल सेवाएं", "भू-स्थानिक सेवा निर्देशिका खोलें।"],
    },
  },
  "/rti": {
    title: "आरटीआई",
    description: "सूचना का अधिकार — जन सूचना अधिकारी, अपीलीय प्राधिकारी और नियम।",
    links: {
      "/rti": ["सूचना का अधिकार (आरटीआई)", "जन सूचना अधिकारी और आवेदन संबंधी मार्गदर्शन।"],
    },
  },
  "/flood-reports": {
    title: "बाढ़",
    description: "उपग्रह आधारित दैनिक बाढ़ रिपोर्ट और बाढ़ मानचित्र।",
    links: {
      "/flood-reports": ["दैनिक बाढ़ रिपोर्ट", "मानसून अवधि की उपग्रह आधारित बाढ़ रिपोर्ट।"],
    },
  },
  "/gallery": {
    title: "फोटो गैलरी",
    description: "आरएसएसी-यूपी के कार्यक्रम, प्रशिक्षण और क्षेत्र गतिविधियों की तस्वीरें।",
    links: {},
  },
  "/tenders": {
    title: "निविदा",
    description: "निविदा सूचनाएं और उत्तर प्रदेश ई-टेंडर पोर्टल।",
    links: {},
  },
  "/faq": {
    title: "सामान्य प्रश्न",
    description: "आरएसएसी-यूपी की सेवाओं और डाटा से जुड़े सामान्य प्रश्न।",
    links: {},
  },
  "/contact": {
    title: "संपर्क करें",
    description: "पता, ईमेल, दूरभाष, संपर्क विवरण और प्रतिक्रिया।",
    links: {
      "/contact": ["संपर्क विवरण", "पता, ईमेल और दूरभाष विवरण।"],
      "/feedback": ["प्रतिक्रिया", "वेबसाइट और जन सेवाओं पर सुझाव भेजें।"],
    },
  },
  "/about-us": {
    title: "हमारे बारे में",
    description: "संस्था परिचय, मिशन, नेतृत्व और संगठन संरचना।",
    links: {
      "/about-us": ["सभी", "सभी आधिकारिक 'हमारे बारे में' पृष्ठ खोलें।"],
      "/about-us/read-more-about-us": ["आरएसएसी-यूपी अवलोकन", "संस्थागत अवलोकन और पृष्ठभूमि पढ़ें।"],
      "/about-us/our-formers": ["हमारे पूर्व", "पूर्व अध्यक्ष, निदेशक और वैज्ञानिक।"],
      "/vision": ["दृष्टि एवं मिशन", "मिशन, दृष्टि और कार्य उद्देश्य।"],
      "/leadership": ["नेतृत्व", "शासन और केंद्र नेतृत्व प्रोफाइल।"],
      "/organisation-chart": ["संगठनात्मक चार्ट", "आधिकारिक संगठनात्मक संरचना।"],
      "/scientists": ["वैज्ञानिक कार्मिक", "डोमेन और नियुक्ति विवरण सहित वैज्ञानिक प्रोफाइल।"],
      "/administration": ["प्रशासनिक एवं सहायक कर्मचारी", "प्रशासनिक संपर्क और वेबसाइट सहायता।"],
    },
  },
  "/divisions": {
    title: "विभाग",
    description: "वैज्ञानिक प्रभाग, परियोजनाएं, रिपोर्ट और मानचित्र।",
    links: {
      "/divisions": ["सभी", "वैज्ञानिक प्रभाग निर्देशिका खोलें।"],
      "/divisions/agriculture-resources-division1": ["कृषि संसाधन", "कृषि संसाधन अनुप्रयोग और संबंधित कार्य।"],
      "/divisions/school-of-geo-informatics-division1": ["स्कूल ऑफ जियो-इंफॉर्मेटिक्स", "शैक्षणिक और जियो-इंफॉर्मेटिक्स प्रभाग विवरण।"],
    },
  },
  "/facilities": {
    title: "सुविधाएं",
    description: "प्रयोगशालाएं, डाटा बैंक, पुस्तकालय, छात्रावास और तकनीकी सुविधाएं।",
    links: {
      "/facilities": ["सभी", "आरएसएसी-यूपी की संपूर्ण सुविधा निर्देशिका खोलें।"],
      "/facilities/library1": ["पुस्तकालय", "10,300+ पुस्तकें, 130 पत्रिकाएं, मानचित्र, शोध-प्रबंध और तकनीकी रिपोर्ट।"],
      "/facilities/lidar-bathymetry-lab": ["लाइडार एवं बाथीमेट्री", "अत्याधुनिक लाइडार और सोनार डाटा प्रसंस्करण प्रयोगशाला।"],
      "/facilities/data-bank1": ["डाटा बैंक", "उपग्रह डाटा संग्रह, स्थलाकृतिक शीट, हवाई छायाचित्र और स्थानिक डाटासेट।"],
      "/facilities/computer-and-image-processing-lab1": ["जियोइन्फॉर्मेटिक्स लैब", "जीआईएस, इमेज-प्रोसेसिंग सॉफ्टवेयर, डाटासेंटर, वर्कस्टेशन और एंटरप्राइज लैन।"],
      "/facilities/water-analysis-lab1": ["जल विश्लेषण लैब", "पर्यावरण और जलवैज्ञानिक जांच हेतु जल-गुणवत्ता विश्लेषण उपकरण।"],
      "/facilities/soil-analysis-lab1": ["मृदा विश्लेषण लैब", "पीएच, ईसी, कार्बनिक पदार्थ, बनावट, पोषक तत्व और कीटनाशी अवशेष हेतु मृदा विश्लेषण।"],
      "/facilities/cartography-reprography": ["मानचित्रकला एवं पुनरुत्पादन", "मानचित्र निर्माण, बड़े-प्रारूप मुद्रण, स्कैनिंग और पुनरुत्पादन सहायता।"],
      "/facilities/training-hostels": ["प्रशिक्षण छात्रावास", "प्रशिक्षुओं, अधिकारियों, अतिथियों और शोधकर्ताओं हेतु आर्यभट्ट प्रशिक्षण छात्रावास।"],
    },
  },
  "/academics": {
    title: "शैक्षिक",
    description: "स्कूल ऑफ जियो-इन्फॉर्मेटिक्स, प्रशिक्षण और क्षमता निर्माण।",
    links: {
      "/academics": ["सभी", "शैक्षणिक और प्रशिक्षण पृष्ठ खोलें।"],
      "/academics/school-of-geo-informatics-": ["स्कूल ऑफ जियो-इंफॉर्मेटिक्स", "स्कूल ऑफ जियो-इंफॉर्मेटिक्स कार्यक्रम जानकारी।"],
      "/academics/training-division-": ["प्रशिक्षण प्रभाग", "प्रशिक्षण और क्षमता-निर्माण विवरण।"],
    },
  },
  "/geoportals": {
    title: "जिओ-पोर्टल",
    description: "आधिकारिक जियो-पोर्टल और बाहरी सेवा लिंक।",
    links: {
      "/geoportals": ["सभी", "जिओ-पोर्टल सेवा निर्देशिका खोलें।"],
    },
  },
  "/manpower": {
    title: "कार्मिक",
    description: "नेतृत्व, वैज्ञानिक, तकनीकी कर्मचारी और प्रशासन।",
    links: {
      "/leadership": ["नेतृत्व", "शासन और केंद्र नेतृत्व प्रोफाइल।"],
      "/scientists": ["वैज्ञानिक", "डोमेन और नियुक्ति विवरण सहित वैज्ञानिक प्रोफाइल।"],
      "/technical-staff": ["तकनीकी कर्मचारी", "तकनीकी और सुविधा सहायता कार्मिक।"],
      "/administration": ["प्रशासन", "प्रशासनिक संपर्क और वेबसाइट सहायता।"],
      "/manpower": ["कार्मिक", "आरएसएसी-यूपी कार्मिक समूहों का अवलोकन।"],
    },
  },
};

export const localizeMenuItems = (items, language) => {
  if (language !== "hi") {
    return items;
  }

  const pick = (current, fallback) =>
    hasDevanagari(current) ? current : fallback || current;

  return items.map((item) => {
    const translation = menuTranslations[item.path] || {};
    return {
      ...item,
      title: pick(item.title, translation.title),
      description: pick(item.description, translation.description),
      links: (item.links || []).map((link) => {
        const translatedLink = translation.links?.[link.path];
        return translatedLink
          ? {
              ...link,
              label: pick(link.label, translatedLink[0]),
              description: pick(link.description, translatedLink[1]),
            }
          : link;
      }),
    };
  });
};

export const publicInfoPagesHindi = [
  {
    slug: "rti",
    title: "सूचना का अधिकार (आरटीआई)",
    eyebrow: "जन सेवाएं",
    summary:
      "आरएसएसी-यूपी अभिलेखों के लिए जन सूचना अधिकारी, आवेदन प्रक्रिया और आरटीआई सहायता संबंधी जानकारी।",
    sections: [
      {
        heading: "आरटीआई के बारे में",
        body:
          "नागरिक सूचना का अधिकार अधिनियम, 2005 के अंतर्गत सुदूर संवेदन उपयोग केंद्र, उत्तर प्रदेश के पास उपलब्ध सूचना मांग सकते हैं। आवेदन में वांछित सूचना स्पष्ट रूप से लिखें।",
      },
      {
        heading: "जन सूचना एवं अपीलीय अधिकारी",
        body:
          "सूचना का अधिकार अधिनियम, 2005 के अंतर्गत आरएसएसी-यूपी में आरटीआई संबंधी कार्य निम्नलिखित अधिकारियों द्वारा देखे जाते हैं:",
        officers: [
          {
            name: "श्री सुशील चन्द्र",
            post: "प्रथम अपीलीय अधिकारी",
            phone: "+91-8765977653",
          },
          {
            name: "डॉ. अनिल कुमार",
            post: "जन सूचना अधिकारी",
            phone: "+91-8765977669",
          },
          {
            name: "श्री रामाकान्त",
            post: "सहायक जन सूचना अधिकारी",
            phone: "+91-8765977643",
          },
        ],
        address:
          "सुदूर संवेदन उपयोग केंद्र, उ.प्र., सेक्टर-जी, जानकीपुरम, कुर्सी रोड, लखनऊ-226021। दूरभाष: 0522-2730451।",
      },
      {
        heading: "आवेदन कैसे करें",
        body:
          "निर्धारित शुल्क के साथ लिखित आवेदन जमा करें। सूचना का विषय, संबंधित अवधि और उत्तर प्राप्त करने का वांछित माध्यम स्पष्ट लिखें।",
      },
      {
        heading: "अपील और सहायता",
        body:
          "निर्धारित अवधि में उत्तर न मिलने या उत्तर से असंतुष्ट होने पर आरटीआई अधिनियम के अंतर्गत अपीलीय व्यवस्था का उपयोग किया जा सकता है।",
      },
      {
        heading: "वैधानिक दस्तावेज",
        body:
          "सूचना का अधिकार अधिनियम, 2005 के अंतर्गत आरएसएसी-यूपी के निम्नलिखित वैधानिक दस्तावेज जन सूचना हेतु प्रकाशित किए गए हैं।",
        documents: [
          {
            title: "एसोसिएशन का ज्ञापन (मेमोरेंडम ऑफ एसोसिएशन)",
            url: "/official-media/siteContent/pdf/memorendum_061017.pdf",
            meta: "आकार: 1.3 एमबी · अंग्रेज़ी · अपलोड 30/12/2017",
          },
          {
            title: "सामान्य सेवा नियमावली",
            url: "/official-media/siteContent/pdf/general-service_161017.pdf",
            meta: "आकार: 5.5 एमबी · अंग्रेज़ी · अपलोड 30/12/2017",
          },
        ],
      },
    ],
  },
  {
    slug: "feedback",
    title: "प्रतिक्रिया",
    eyebrow: "जन सेवाएं",
    summary:
      "आरएसएसी-यूपी वेबसाइट और जन सेवाओं को बेहतर बनाने के लिए सुझाव साझा करें।",
    sections: [
      {
        heading: "वेबसाइट प्रतिक्रिया",
        body:
          "नेविगेशन, सुगम्यता, सामग्री की स्पष्टता, डाउनलोड और उपयोग अनुभव पर अपनी प्रतिक्रिया भेजें।",
      },
      {
        heading: "क्या जानकारी दें",
        body:
          "संबंधित पृष्ठ का पता, उपकरण और ब्राउज़र तथा समस्या या सुझाव का संक्षिप्त विवरण लिखें।",
      },
      {
        heading: "प्रतिक्रिया भेजें",
        body:
          "आधिकारिक संपर्क ईमेल पर विषय पंक्ति में 'वेबसाइट प्रतिक्रिया' लिखकर प्रतिक्रिया भेजें।",
      },
      {
        heading: "कार्रवाई",
        body:
          "वेब सूचना प्रबंधक और वेबसाइट सहायता दल उपयोगी प्रतिक्रिया की समीक्षा करते हैं।",
      },
    ],
  },
  {
    slug: "tenders",
    title: "निविदाएं एवं क्रय",
    eyebrow: "जन सेवाएं",
    summary:
      "आरएसएसी-यूपी निविदाओं के लिए क्रय सूचनाएं और उत्तर प्रदेश ई-टेंडर पोर्टल।",
    sections: [
      {
        heading: "आधिकारिक ई-टेंडर पोर्टल",
        body:
          "आरएसएसी-यूपी की निविदाएं उत्तर प्रदेश शासन के ई-टेंडर पोर्टल पर प्रकाशित होती हैं। सक्रिय निविदा, शुद्धिपत्र और परिणाम के लिए पोर्टल देखें।",
      },
      {
        heading: "उत्तर प्रदेश ई-टेंडर पोर्टल",
        body:
          "पंजीकरण, दस्तावेज डाउनलोड और ऑनलाइन बोली जमा करने के लिए आधिकारिक पोर्टल खोलें।",
        externalUrl: "https://etender.up.nic.in",
        actionLabel: "ई-टेंडर पोर्टल खोलें",
      },
      {
        heading: "निविदा संबंधी पूछताछ",
        body:
          "पत्राचार में संबंधित निविदा संख्या स्पष्ट लिखकर आरएसएसी-यूपी निदेशक कार्यालय से संपर्क करें।",
      },
      {
        heading: "वेबसाइट पर सूचनाएं",
        body:
          "भर्ती विज्ञापन, परिपत्र और डाउनलोड योग्य दस्तावेज वेबसाइट के सूचना अनुभाग में उपलब्ध हैं।",
      },
    ],
  },
  {
    slug: "faq",
    title: "सामान्य प्रश्न",
    eyebrow: "जन सेवाएं",
    summary:
      "आरएसएसी-यूपी की सेवाओं, डाटा अनुरोध, भर्ती और भू-स्थानिक नीति से जुड़े सामान्य प्रश्न।",
    sections: [
      {
        heading: "आरएसएसी-यूपी क्या कार्य करता है?",
        body:
          "रिमोट सेंसिंग एप्लीकेशन्स सेंटर, उत्तर प्रदेश उपग्रह सुदूर संवेदन, जीआईएस और जीपीएस का उपयोग कृषि, जल, वन, भू-उपयोग, नगरीय सर्वेक्षण और आपदा प्रबंधन हेतु उत्तर प्रदेश के विभागों के लिए करता है।",
      },
      {
        heading: "भू-संदर्भित डाटा या मानचित्र कैसे प्राप्त करें?",
        body:
          "विभाग और संस्थाएं भू-संदर्भित डाटा, विषयगत मानचित्र और परियोजना सहायता हेतु निदेशक कार्यालय को आवेदन कर सकते हैं। स्व-सेवा डाटासेट और मानचित्र सेवाओं हेतु जियो-पोर्टल निर्देशिका देखें।",
      },
      {
        heading: "आरएसएसी-यूपी को कार्मिक सेवाएं कौन प्रदान करता है?",
        body:
          "कार्मिक एवं एचआर सेवाएं वांशिका एचआर सर्विसेज प्राइवेट लिमिटेड, लखनऊ के माध्यम से प्रदान की जाती हैं।",
      },
      {
        heading: "राष्ट्रीय भू-स्थानिक नीति क्या है?",
        body:
          "राष्ट्रीय भू-स्थानिक नीति भारत में भू-स्थानिक डाटा के अधिग्रहण, निर्माण और साझाकरण हेतु ढांचा, उद्देश्य और दिशानिर्देश निर्धारित करती है, जिससे खुली पहुंच और सशक्त घरेलू भू-स्थानिक तंत्र संभव होता है।",
      },
      {
        heading: "वैज्ञानिकों की वरिष्ठता सूची कहां मिलेगी?",
        body:
          "वैज्ञानिकों की वरिष्ठता सूची और संबंधित स्थापना आदेश इस वेबसाइट के सूचना अनुभाग में आधिकारिक दस्तावेज के रूप में प्रकाशित किए जाते हैं।",
      },
      {
        heading: "आरटीआई आवेदन या संपर्क कैसे करें?",
        body:
          "आरटीआई आवेदन जन सूचना अधिकारी को प्रस्तुत किए जा सकते हैं। प्रक्रिया हेतु आरटीआई पृष्ठ और पता, दूरभाष एवं ईमेल हेतु संपर्क पृष्ठ देखें।",
      },
      {
        heading: "संस्थान विवरण",
        body:
          "संस्थान का नाम: रिमोट सेंसिंग एप्लीकेशन्स सेंटर, उ.प्र.। पैन (PAN): AABAR0170L। टैन (TAN): LKNR05718G। जीएसटीआईएन (GSTIN): 09AABAR0170L1ZG।",
      },
    ],
  },
];

export const divisionHindiFallback = {
  "agriculture-resources": ["कृषि संसाधन प्रभाग", "फसल आकलन और मौसमी कृषि निगरानी।"],
  "computer-image-processing": ["कंप्यूटर प्रतिबिंब प्रसंस्करण प्रभाग", "जीआईएस, प्रतिबिंब प्रसंस्करण और सूचना प्रणाली सहायता।"],
  "earth-resources": ["पृथ्वी संसाधन प्रभाग", "भू-आकृति, नदी परिवर्तन और प्राकृतिक संसाधन मानचित्रण।"],
  "forest-resources-ecology": ["वन संसाधन एवं पारिस्थितिकी प्रभाग", "वन, जैव विविधता और पर्यावरण अनुश्रवण।"],
  "groundwater-resources": ["भूजल संसाधन प्रभाग", "भूजल अन्वेषण और जल संसाधन योजना।"],
  "geo-spatial-data-bank": ["भू-स्थानिक डाटा बैंक प्रभाग", "स्थानिक डाटा भंडार और जीआईएस सेवाएं।"],
  "landuse-urban-survey": ["भू-उपयोग एवं नगरीय सर्वेक्षण प्रभाग", "भू-उपयोग, नगरीय योजना और अवस्थापना अध्ययन।"],
  "soil-resources": ["मृदा संसाधन प्रभाग", "मृदा सर्वेक्षण, क्षरण और सुधार अनुश्रवण।"],
  "surface-water-resources": ["सतही जल संसाधन प्रभाग", "सतही जल, बाढ़ और नदी अध्ययन।"],
  training: ["प्रशिक्षण प्रभाग", "प्रशिक्षण, कार्यशाला और क्षमता निर्माण।"],
  "school-of-geoinformatics": ["स्कूल ऑफ जियो-इन्फॉर्मेटिक्स", "सुदूर संवेदन एवं जीआईएस में उच्च शिक्षा।"],
};

export const facilityHindiFallback = {
  "Geoinformatics facilities": ["जियो-इन्फॉर्मेटिक्स सुविधाएं", "जीआईएस, प्रतिबिंब प्रसंस्करण और सुरक्षित कंप्यूटिंग अवसंरचना।"],
  "Water Analysis Lab": ["जल विश्लेषण प्रयोगशाला", "जल गुणवत्ता और जलवैज्ञानिक जांच की सुविधा।"],
  "Soil Analysis Lab": ["मृदा विश्लेषण प्रयोगशाला", "मृदा के भौतिक और रासायनिक विश्लेषण की सुविधा।"],
  "Data Bank": ["डाटा बैंक", "उपग्रह डाटा, मानचित्र और भू-स्थानिक अभिलेख।"],
  "Technical Cell": ["तकनीकी प्रकोष्ठ", "तकनीकी गतिविधि अनुश्रवण और संस्थागत दस्तावेजीकरण।"],
  Library: ["पुस्तकालय", "पुस्तक, पत्रिका, रिपोर्ट, मानचित्र और संदर्भ सेवाएं।"],
  "Cartography and Reprography": ["मानचित्रकला एवं पुनरुत्पादन", "मानचित्र निर्माण, मुद्रण और पुनरुत्पादन सहायता।"],
  "Training Hostels": ["प्रशिक्षण छात्रावास", "प्रशिक्षार्थियों और आगंतुकों के लिए आवास।"],
  "Service Block": ["सेवा खंड", "विद्युत, बैकअप, शीतलन और जल अवसंरचना।"],
  "LiDAR and Bathymetry": ["लाइडार एवं बाथीमेट्री", "3डी पॉइंट क्लाउड और जलगहराई डाटा प्रसंस्करण।"],
};

export const localizeBasicItems = (domain, items, language) => {
  if (language !== "hi") {
    return items;
  }

  const pick = (current, fallback) =>
    hasDevanagari(current) ? current : fallback || current;

  if (domain === "divisions") {
    return items.map((item) => {
      const translated = divisionHindiFallback[item.id];
      return translated
        ? {
            ...item,
            title: pick(item.title, translated[0]),
            lead: pick(item.lead, translated[1]),
          }
        : item;
    });
  }

  if (domain === "facilities") {
    return items.map((item) => {
      const translated = facilityHindiFallback[item.title];
      return translated
        ? {
            ...item,
            title: pick(item.title, translated[0]),
            text: pick(item.text, translated[1]),
          }
        : item;
    });
  }

  return items;
};

export const floodSectionHindi = {
  eyebrow: "आपदा प्रतिक्रिया",
  title: "दैनिक बाढ़ रिपोर्ट एवं अनुश्रवण",
  intro:
    "मानसून अवधि में आरएसएसी-यूपी उत्तर प्रदेश के प्रभावित जिलों हेतु उपग्रह आधारित दैनिक बाढ़ जलप्लावन रिपोर्ट प्रकाशित करता है। ये रिपोर्ट बहु-संवेदी उपग्रह डाटा को क्षेत्रीय इनपुट से जोड़कर राहत एवं प्रतिक्रिया कार्यों में सहायता करती हैं।",
  note:
    "दैनिक रिपोर्ट सक्रिय मानसून अवधि (सामान्यतः जुलाई से अक्टूबर) में प्रकाशित होती हैं। इस अवधि के बाहर नवीनतम सत्र का अभिलेख नीचे उपलब्ध रहता है, और पुराने सत्र वर्षवार अभिलेख से खोले जा सकते हैं।",
  programmeHeading: "आरएसएसी-यूपी का बाढ़ कार्यक्रम",
  programmes: [
    {
      id: "daily-inundation",
      title: "दैनिक बाढ़ जलप्लावन मानचित्रण",
      description:
        "मानसून के दौरान उपग्रह पास से जलप्लावित क्षेत्रों का निकट-वास्तविक समय मानचित्रण, जो राहत आयुक्त एवं जिला प्रशासन से साझा किया जाता है।",
      icon: "radar",
    },
    {
      id: "hazard-zonation",
      title: "बाढ़ संकट क्षेत्र निर्धारण",
      description:
        "बहु-वर्षीय बाढ़ परतों को मिलाकर संकट क्षेत्र मानचित्र बनाए जाते हैं जो बार-बार प्रभावित गांवों, तटबंधों और अवसंरचना की पहचान करते हैं।",
      icon: "map",
    },
    {
      id: "damage-assessment",
      title: "बाढ़ पश्चात क्षति आकलन",
      description:
        "बड़ी बाढ़ घटनाओं के बाद फसल-क्षेत्र और बस्ती क्षति का आकलन, जो मुआवजा एवं पुनर्वास योजना में सहायता करता है।",
      icon: "scan",
    },
  ],
  archiveHeading: "वर्षवार बाढ़ अभिलेख",
  archiveNote:
    "पुराने स्वीकृत रिपोर्ट दस्तावेज या अभिलेख लिंक के रूप में Directus से जोड़े जा सकते हैं।",
  resourcesHeading: "संबंधित पोर्टल",
  resources: [
    {
      label: "राहत आयुक्त, उत्तर प्रदेश",
      url: "https://rahat.up.nic.in",
      description: "राज्य आपदा राहत संचालन और बाढ़ बुलेटिन।",
    },
    {
      label: "इंडिया-व्रिस",
      url: "https://indiawris.gov.in",
      description: "राष्ट्रीय जल संसाधन सूचना प्रणाली।",
    },
    {
      label: "भुवन (एनआरएससी)",
      url: "https://bhuvan.nrsc.gov.in",
      description: "इसरो जियोपोर्टल जिसमें बाढ़ संकट सेवाएं हैं।",
    },
  ],
};

export const localizeFloodSection = (floodSection, language) =>
  language === "hi"
    ? mergeHindiFallback(floodSection, floodSectionHindi)
    : floodSection;

export const localizeSiteSettingsFallback = (settings, language) =>
  language === "hi"
    ? mergeHindiFallback(settings, siteSettingsHindi)
    : settings;

export const localizePublicInfoFallback = (pages, language) => {
  if (language !== "hi") {
    return pages;
  }

  const bySlug = new Map(publicInfoPagesHindi.map((page) => [page.slug, page]));
  return pages.map((page) =>
    bySlug.has(page.slug)
      ? mergeHindiFallback(page, bySlug.get(page.slug))
      : page
  );
};
