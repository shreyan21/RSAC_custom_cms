import { Compass, ListChecks, Layers, Workflow } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import BackButton from "../../components/navigation/BackButton";
import { deepMerge } from "../../data/directusAdapter";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";

// Exported for the additive CMS seed so every visible sentence receives a
// normal Website Text form field without duplicating this long content map.
// eslint-disable-next-line react-refresh/only-export-components
export const visionMissionContent = {
  en: {
    eyebrow: "Institutional Vision",
    title: "Vision, Mission, Objectives & Approach",
    intro:
      "RSAC-UP applies geospatial science to strengthen public planning, natural-resource management, and resilient governance across Uttar Pradesh.",
    back: "Back to Home",
    cards: [
      {
        label: "Vision",
        title: "Geospatial Intelligence for Sustainable Governance",
        text: "To establish RSAC-UP as a premier geospatial intelligence institution supporting scientific governance, sustainable development, natural resource management, disaster resilience, and spatial decision support systems across Uttar Pradesh.",
      },
      {
        label: "Mission",
        title: "Advanced Spatial Technologies for Public Good",
        text: "To utilize Remote Sensing, GIS, AI, LiDAR, Bathymetry, and spatial analytics for planning, monitoring, environmental intelligence, disaster management, agricultural assessment, urban development, and governance support systems.",
      },
    ],
    objectivesHeading: "Objectives",
    objectives: [
      "To undertake, promote, guide, coordinate and aid research and development in the field of remote sensing.",
      "To provide consultancy services and arrange airborne survey facilities to user agencies on actual costs basis.",
      "To carry out surveys for monitoring and assessment of the entire gamut of natural resources using remote sensing techniques.",
      "To carry out special temporal surveys to monitor changing land-use patterns, environmental changes, irrigation systems, forest resources, and crop disease surveillance.",
      "To develop an efficient data acquisition and retrieval system, act as a repository of various natural resources data, and act as a nodal organisation in the State advising user agencies and disseminating remote sensing technology at operational levels.",
      "To provide research and development support to the teaching and research organisations of the State in specified areas of remote sensing technology.",
      "To carry out field investigations connected with the activities of remote sensing technology and its applications.",
      "To cooperate and collaborate with other national and international organisations in the field of remote sensing and allied disciplines.",
      "To periodically publish the results of remote sensing investigations carried out by the Centre.",
    ],
    approachHeading: "Approach",
    approach: [
      "Integrating multi-stage remote sensing techniques with conventional technologies for optimum benefits.",
      "Providing accurate natural resources information in multi-temporal mode.",
      "Acting as an interface between high technology and the end user for effective technology dissemination.",
    ],
    implementationHeading: "Implementation",
    implementationIntro:
      "Ever since its inception, the Centre has been using remote sensing technology in conjunction with other conventional techniques for the optimum exploitation and management of various natural resources in the State. The Centre implements its natural resources management projects under two distinct modes:",
    implementation: [
      "Some projects are implemented under the ongoing research and development schemes within the Centre.",
      "A majority of the projects are undertaken at the behest of user departments, either from within the State of U.P. or from national and international agencies.",
    ],
    sphereHeading: "Sphere of Activities",
    sphereIntro:
      "The Centre's applications of remote sensing and GIS span the full range of the State's natural resources and developmental needs.",
    sphere: [
      {
        name: "Water Resources",
        items: [
          "Hydrogeomorphological mapping",
          "Ground-water targeting",
          "Flood inundation mapping",
          "Monitoring water-logged areas",
          "Monitoring the dynamics of river systems",
          "Water quality studies",
          "Wetland studies",
          "Glaciological studies",
          "Rain water conservation & artificial recharge studies",
        ],
      },
      {
        name: "Soil Resources",
        items: [
          "Delineation of wastelands",
          "Delineation of sodic lands",
          "Sodic-land reclamation monitoring at plot level",
          "Soil type mapping",
          "Classification, characterization and mapping of soils for soil resources inventory",
          "Identification & characterization of degraded lands",
          "Study of causes of land degradation & suggesting measures",
        ],
      },
      {
        name: "Forest Resources",
        items: [
          "Forest mapping and area estimation",
          "Forest type and species identification",
          "Forest change detection",
          "Habitat assessment for wildlife management",
          "Encroachment on forest land",
          "Identification of suitable areas for afforestation",
          "Forest fire detection & damage assessment",
          "Identification of fire-prone areas",
        ],
      },
      {
        name: "Landuse / Land cover & Urban Surveys",
        items: [
          "Preparation of development plans",
          "Urban settlement & landuse mapping for urban planning",
          "Landuse / land cover mapping for regional planning",
          "Urban sprawl studies",
          "Urban infrastructure mapping",
        ],
      },
      {
        name: "Earth Resources",
        items: [
          "Landslide studies",
          "Fluvio-geomorphic studies",
          "Mineral targeting",
          "Lineament studies",
        ],
      },
      {
        name: "Agriculture & Horticulture Resources",
        items: [
          "Pre-harvest crop acreage & production estimation for wheat, paddy, mustard & sugarcane",
          "R&D in orchard identification",
          "Acreage estimation of large orchards such as mango, aonla & guava",
          "Sericulture developmental studies",
          "Cropping system analysis",
          "Crop damage assessment studies",
          "Crop condition assessment studies",
          "Drought condition assessment",
        ],
      },
      {
        name: "Environment & Ecological Studies",
        items: [
          "Environmental impact assessment due to mining",
          "Environmental monitoring of sodic-land reclamation programmes on soil & water",
          "Environmental impact assessment in dam catchment & command areas",
          "Geo-environmental related studies",
        ],
      },
      {
        name: "Integrated Natural Resources Studies",
        items: [
          "Integrated Mission for Sustainable Development (IMSD) — water & land resources development plans for integrated watershed development",
          "National Natural Resources Information System (NRIS) — a GIS-based decision support system",
          "Natural Resources Data Management System (NRDMS) — district-level computerized databases",
          "Space-based Information System for De-centralized Planning (SIS-DP)",
        ],
      },
      {
        name: "Other Activities",
        items: [
          "Delineation of slum areas & health facilities in selected cities of U.P.",
          "Digital database for cadastral resource mapping",
          "Establishment of disaster management systems in selected districts of U.P.",
          "Training in remote sensing and GIS techniques for user departments",
        ],
      },
    ],
  },
  hi: {
    eyebrow: "संस्थागत दृष्टि",
    title: "दृष्टि, ध्येय, उद्देश्य एवं दृष्टिकोण",
    intro:
      "आरएसएसी-यूपी उत्तर प्रदेश में सार्वजनिक नियोजन, प्राकृतिक संसाधन प्रबंधन एवं सुदृढ़ शासन को मजबूत करने हेतु भू-स्थानिक विज्ञान का उपयोग करता है।",
    back: "मुखपृष्ठ पर वापस जाएं",
    cards: [
      {
        label: "दृष्टि",
        title: "सतत शासन हेतु भू-स्थानिक बुद्धिमत्ता",
        text: "आरएसएसी-यूपी को एक अग्रणी भू-स्थानिक बुद्धिमत्ता संस्था के रूप में स्थापित करना जो उत्तर प्रदेश में वैज्ञानिक शासन, सतत विकास, प्राकृतिक संसाधन प्रबंधन, आपदा सहनशीलता एवं स्थानिक निर्णय समर्थन प्रणालियों का समर्थन करे।",
      },
      {
        label: "ध्येय",
        title: "जनहित हेतु उन्नत स्थानिक तकनीकें",
        text: "नियोजन, अनुश्रवण, पर्यावरणीय बुद्धिमत्ता, आपदा प्रबंधन, कृषि आकलन, नगरीय विकास एवं शासन समर्थन प्रणालियों हेतु सुदूर संवेदन, जीआईएस, एआई, लिडार, बाथिमेट्री एवं स्थानिक विश्लेषण का उपयोग करना।",
      },
    ],
    objectivesHeading: "उद्देश्य",
    objectives: [
      "सुदूर संवेदन के क्षेत्र में अनुसंधान एवं विकास कार्य करना, बढ़ावा देना तथा मार्गदर्शन, समन्वय एवं सहायता प्रदान करना।",
      "उपयोगकर्ता एजेंसियों को वास्तविक लागत पर परामर्श सेवाएं तथा हवाई सर्वेक्षण सुविधाएं उपलब्ध कराना।",
      "सुदूर संवेदन तकनीकों से समस्त प्राकृतिक संसाधनों के अनुश्रवण एवं आकलन हेतु सर्वेक्षण करना।",
      "बदलते भू-उपयोग प्रारूप, पर्यावरणीय परिवर्तन, सिंचाई प्रणाली, वन संसाधन तथा फसल रोग निगरानी हेतु विशेष कालिक सर्वेक्षण करना।",
      "कुशल डाटा अधिग्रहण एवं पुनर्प्राप्ति प्रणाली विकसित करना, विभिन्न प्राकृतिक संसाधन डाटा के भंडार के रूप में कार्य करना तथा राज्य में नोडल संस्था के रूप में उपयोगकर्ता एजेंसियों का मार्गदर्शन कर परिचालन स्तर पर सुदूर संवेदन तकनीक का प्रसार करना।",
      "सुदूर संवेदन तकनीक के निर्दिष्ट क्षेत्रों में राज्य के शिक्षण एवं अनुसंधान संस्थानों को अनुसंधान एवं विकास सहायता प्रदान करना।",
      "सुदूर संवेदन तकनीक एवं इसके अनुप्रयोगों से संबंधित क्षेत्रीय जांच करना।",
      "सुदूर संवेदन एवं संबद्ध विषयों के क्षेत्र में अन्य राष्ट्रीय एवं अंतर्राष्ट्रीय संस्थाओं के साथ सहयोग एवं समन्वय करना।",
      "केंद्र द्वारा किए गए सुदूर संवेदन अध्ययनों के परिणामों का समय-समय पर प्रकाशन करना।",
    ],
    approachHeading: "दृष्टिकोण",
    approach: [
      "इष्टतम लाभ हेतु बहु-स्तरीय सुदूर संवेदन तकनीकों को पारंपरिक तकनीकों के साथ एकीकृत करना।",
      "बहु-कालिक रूप में सटीक प्राकृतिक संसाधन सूचना उपलब्ध कराना।",
      "प्रभावी तकनीक प्रसार हेतु उच्च तकनीक एवं अंतिम उपयोगकर्ता के बीच सेतु के रूप में कार्य करना।",
    ],
    implementationHeading: "क्रियान्वयन",
    implementationIntro:
      "अपनी स्थापना के समय से ही यह केंद्र राज्य के विभिन्न प्राकृतिक संसाधनों के इष्टतम उपयोग एवं प्रबंधन हेतु अन्य पारंपरिक तकनीकों के साथ सुदूर संवेदन तकनीक का उपयोग करता रहा है। केंद्र दो भिन्न प्रणालियों के अंतर्गत अपनी प्राकृतिक संसाधन प्रबंधन परियोजनाओं का क्रियान्वयन करता है:",
    implementation: [
      "कुछ परियोजनाएं केंद्र के भीतर चल रही अनुसंधान एवं विकास योजनाओं के अंतर्गत क्रियान्वित की जाती हैं।",
      "अधिकांश परियोजनाएं उपयोगकर्ता विभागों के अनुरोध पर — चाहे वे उत्तर प्रदेश राज्य के भीतर हों अथवा राष्ट्रीय एवं अंतर्राष्ट्रीय एजेंसियों से — की जाती हैं।",
    ],
    sphereHeading: "गतिविधियों का क्षेत्र",
    sphereIntro:
      "केंद्र द्वारा सुदूर संवेदन एवं जीआईएस के अनुप्रयोग राज्य के प्राकृतिक संसाधनों एवं विकास संबंधी आवश्यकताओं के समस्त क्षेत्रों में फैले हुए हैं।",
    sphere: [
      {
        name: "जल संसाधन",
        items: [
          "जलभूआकृतिक (हाइड्रोजियोमॉर्फोलॉजिकल) मानचित्रण",
          "भूजल लक्ष्यीकरण",
          "बाढ़ जलमग्नता मानचित्रण",
          "जलप्लावित क्षेत्रों का अनुश्रवण",
          "नदी तंत्र की गतिशीलता का अनुश्रवण",
          "जल गुणवत्ता अध्ययन",
          "आर्द्रभूमि (वेटलैंड) अध्ययन",
          "हिमनद (ग्लेशियर) अध्ययन",
          "वर्षा जल संरक्षण एवं कृत्रिम पुनर्भरण अध्ययन",
        ],
      },
      {
        name: "मृदा संसाधन",
        items: [
          "बंजर भूमि का सीमांकन",
          "ऊसर (सोडिक) भूमि का सीमांकन",
          "प्लॉट स्तर पर ऊसर भूमि सुधार का अनुश्रवण",
          "मृदा प्रकार मानचित्रण",
          "मृदा संसाधन सूची हेतु मृदाओं का वर्गीकरण, अभिलक्षणन एवं मानचित्रण",
          "निम्नीकृत भूमि की पहचान एवं अभिलक्षणन",
          "भूमि निम्नीकरण के कारणों का अध्ययन एवं उपाय सुझाना",
        ],
      },
      {
        name: "वन संसाधन",
        items: [
          "वन मानचित्रण एवं क्षेत्रफल आकलन",
          "वन प्रकार एवं प्रजाति पहचान",
          "वन परिवर्तन संसूचन",
          "वन्यजीव प्रबंधन हेतु आवास आकलन",
          "वन भूमि पर अतिक्रमण",
          "वनरोपण हेतु उपयुक्त क्षेत्रों की पहचान",
          "वनाग्नि संसूचन एवं क्षति आकलन",
          "अग्नि-प्रवण क्षेत्रों की पहचान",
        ],
      },
      {
        name: "भू-उपयोग / भू-आवरण एवं नगरीय सर्वेक्षण",
        items: [
          "विकास योजनाओं की तैयारी",
          "नगरीय नियोजन हेतु नगरीय बसावट एवं भू-उपयोग मानचित्रण",
          "क्षेत्रीय नियोजन हेतु भू-उपयोग / भू-आवरण मानचित्रण",
          "नगरीय विस्तार (अर्बन स्प्रॉल) अध्ययन",
          "नगरीय अवसंरचना मानचित्रण",
        ],
      },
      {
        name: "भू-संसाधन",
        items: [
          "भूस्खलन अध्ययन",
          "नदीय-भूआकृतिक (फ्लूवियो-जियोमॉर्फिक) अध्ययन",
          "खनिज लक्ष्यीकरण",
          "रेखाचिह्न (लीनियामेंट) अध्ययन",
        ],
      },
      {
        name: "कृषि एवं उद्यान संसाधन",
        items: [
          "गेहूं, धान, सरसों एवं गन्ना फसलों हेतु पूर्व-कटाई क्षेत्रफल एवं उत्पादन आकलन",
          "बागों की पहचान में अनुसंधान एवं विकास",
          "आम, आंवला एवं अमरूद जैसे बड़े बागों का क्षेत्रफल आकलन",
          "रेशम उत्पादन (सेरीकल्चर) विकास अध्ययन",
          "फसल प्रणाली विश्लेषण",
          "फसल क्षति आकलन अध्ययन",
          "फसल दशा आकलन अध्ययन",
          "सूखा दशा आकलन",
        ],
      },
      {
        name: "पर्यावरण एवं पारिस्थितिकी अध्ययन",
        items: [
          "खनन से पर्यावरणीय प्रभाव आकलन",
          "मृदा एवं जल पर ऊसर भूमि सुधार कार्यक्रम का पर्यावरणीय अनुश्रवण",
          "बांध जलग्रहण एवं कमांड क्षेत्र में पर्यावरणीय प्रभाव आकलन",
          "भू-पर्यावरण संबंधी अध्ययन",
        ],
      },
      {
        name: "एकीकृत प्राकृतिक संसाधन अध्ययन",
        items: [
          "सतत विकास हेतु एकीकृत मिशन (IMSD) — एकीकृत जलसंभर विकास हेतु जल एवं भूमि संसाधन विकास योजना का सृजन",
          "राष्ट्रीय प्राकृतिक संसाधन सूचना प्रणाली (NRIS) — जीआईएस आधारित निर्णय समर्थन प्रणाली",
          "प्राकृतिक संसाधन डाटा प्रबंधन प्रणाली (NRDMS) — जिला स्तरीय कंप्यूटरीकृत डाटाबेस",
          "विकेंद्रीकृत नियोजन हेतु अंतरिक्ष आधारित सूचना प्रणाली (SIS-DP)",
        ],
      },
      {
        name: "अन्य गतिविधियां",
        items: [
          "उ.प्र. के चयनित शहरों में मलिन बस्तियों एवं स्वास्थ्य सुविधाओं का सीमांकन",
          "भूलेख (कैडस्ट्रल) संसाधन मानचित्रण हेतु डिजिटल डाटाबेस",
          "उ.प्र. के चयनित जिलों में आपदा प्रबंधन प्रणाली की स्थापना",
          "उपयोगकर्ता विभागों को सुदूर संवेदन एवं जीआईएस तकनीक का प्रशिक्षण",
        ],
      },
    ],
  },
};

const VisionMission = () => {
  const { isHindi } = useLanguage();
  const { pageContent } = useSiteSettings();
  const fallback = isHindi
    ? visionMissionContent.hi
    : visionMissionContent.en;
  const c = deepMerge(fallback, pageContent?.visionMission || {});

  return (
    <PageShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      breadcrumbs={[
        { label: isHindi ? "मुखपृष्ठ" : "Home", to: "/" },
        { label: isHindi ? "हमारे बारे में" : "About Us", to: "/about-us" },
        { label: c.title },
      ]}
      actions={<BackButton fallback="/" label={c.back} />}
    >
      <div className="space-y-10">
        {/* Vision & Mission */}
        <div className="grid gap-6 lg:grid-cols-2">
          {c.cards.map((card) => (
            <article
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(18,50,74,0.06)] md:p-8"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
              />
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#0f6f42]">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {card.label}
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-[#102f46]">
                {card.title}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-700">{card.text}</p>
            </article>
          ))}
        </div>

        {/* Objectives */}
        <section id="objectives">
          <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#102f46]">
            <ListChecks className="h-6 w-6 text-[#0f6f42]" aria-hidden="true" />
            {c.objectivesHeading}
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {c.objectives.map((item, i) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(18,50,74,0.04)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f6f42] text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-700">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Approach & Implementation */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section id="approach" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
            <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#102f46]">
              <Workflow className="h-6 w-6 text-[#0b6fa4]" aria-hidden="true" />
              {c.approachHeading}
            </h2>
            <ul className="mt-5 space-y-3">
              {c.approach.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b6fa4]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="implementation" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(18,50,74,0.06)]">
            <h2 className="text-2xl font-extrabold text-[#102f46]">
              {c.implementationHeading}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {c.implementationIntro}
            </p>
            <ul className="mt-4 space-y-3">
              {c.implementation.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6f42]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sphere of Activities */}
        <section id="sphere-of-activities">
          <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-[#102f46]">
            <Layers className="h-6 w-6 text-[#0f6f42]" aria-hidden="true" />
            {c.sphereHeading}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-700">{c.sphereIntro}</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {c.sphere.map((group) => (
              <article
                key={group.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(18,50,74,0.06)]"
              >
                <h3 className="text-lg font-extrabold text-[#0b5f38]">{group.name}</h3>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-sm leading-relaxed text-slate-700"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6f42]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
};

export default VisionMission;
