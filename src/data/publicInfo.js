import { contactDetails } from "./siteContent";

export const publicInfoPages = [
  {
    slug: "rti",
    title: "Right to Information (RTI)",
    summary:
      "Public information officer details, application process, and RTI support for RSAC-UP records.",
    source: "https://rsac.up.gov.in/en/page/right-to-information",
    sections: [
      {
        heading: "About RTI",
        body:
          "Citizens may seek information held by Remote Sensing Applications Centre, Uttar Pradesh under the Right to Information Act, 2005. Requests should clearly describe the information required and be submitted to the designated Public Information Officer.",
      },
      {
        heading: "Public Information & Appellate Authority Officers",
        body:
          "As notified under the Right to Information Act, 2005, the following officers handle RTI matters at RSAC-UP:",
        officers: [
          {
            name: "Mr. Sushil Chandra",
            post: "First Appellate Officer",
            phone: "+91-8765977653",
          },
          {
            name: "Dr. Anil Kumar",
            post: "Public Information Officer",
            phone: "+91-8765977669",
          },
          {
            name: "Shri Ramakant",
            post: "Assistant Public Information Officer",
            phone: "+91-8765977643",
          },
        ],
        address:
          "Remote Sensing Applications Centre, U.P., Sector-G, Jankipuram, Kursi Road, Lucknow-226021. Phone: 0522-2730451.",
      },
      {
        heading: "How to Apply",
        body:
          "RTI applications may be submitted in writing to the PIO at the RSAC-UP address, along with the prescribed fee where applicable. Applicants should mention the subject of information, period concerned, and preferred mode of response.",
      },
      {
        heading: "Appeal and Further Assistance",
        body:
          "If a response is unsatisfactory or not received within the statutory period, applicants may use the appellate mechanism under the RTI Act. For website-related public information support, contact the Web Information Manager through the Contact page.",
      },
      {
        heading: "Statutory Documents",
        body:
          "The following statutory documents of RSAC-UP are published under the Right to Information Act, 2005 for public reference.",
        documents: [
          {
            title: "Memorandum of Association",
            url: "/official-media/siteContent/pdf/memorendum_061017.pdf",
            meta: "Size: 1.3 MB · English · Uploaded 30/12/2017",
          },
          {
            title: "General Service Rules",
            url: "/official-media/siteContent/pdf/general-service_161017.pdf",
            meta: "Size: 5.5 MB · English · Uploaded 30/12/2017",
          },
        ],
      },
    ],
    links: [
      { label: "Contact RSAC-UP", path: "/contact" },
      { label: "Help", path: "/help" },
    ],
  },
  {
    slug: "appellate-authority",
    title: "Appellate Authority",
    summary: "",
    source: "https://rsac.up.gov.in/en/page/appellate-authority",
    sections: [
      {
        heading: "Appellate Authority",
        officers: [
          {
            name: "Mr. Sushil Chandra",
            post: "First Appellate Officer",
            phone: "+91-8765977653",
          },
          {
            name: "Dr. Anil Kumar",
            post: "Public Information Officer",
            phone: "+91-8765977669",
          },
          {
            name: "Shri Ramakant",
            post: "Asstt. Public Information Officer",
            phone: "+91-8765977643",
          },
        ],
        address:
          "Remote Sensing Applications Centre, U.P., Sector-G, Jankipuram, Kursi Road, Lucknow-226021. Phone: 0522-2730451.",
      },
    ],
    links: [
      { label: "Right to Information (RTI)", path: "/rti" },
    ],
  },
  {
    slug: "memorandum-of-association",
    title: "Memorandum of Association",
    summary: "",
    source: "https://rsac.up.gov.in/en/page/memorandum-of-association",
    sections: [
      {
        heading: "Memorandum of Association",
        documents: [
          {
            title: "Memorandum of Association",
            url: "/official-media/siteContent/pdf/memorendum_061017.pdf",
            meta: "Size: 1.3 MB | Language: English | Upload date: 30/12/2017",
          },
        ],
      },
    ],
    links: [
      { label: "Right to Information (RTI)", path: "/rti" },
    ],
  },
  {
    slug: "general-service-rules",
    title: "General Service Rules",
    summary: "",
    source: "https://rsac.up.gov.in/en/page/general-service-rules",
    sections: [
      {
        heading: "General Service Rules",
        documents: [
          {
            title: "General Service Rules",
            url: "/official-media/siteContent/pdf/general-service_161017.pdf",
            meta: "Size: 5.5 MB | Language: English | Upload date: 30/12/2017",
          },
        ],
      },
    ],
    links: [
      { label: "Right to Information (RTI)", path: "/rti" },
    ],
  },
  {
    slug: "feedback",
    title: "Feedback",
    summary:
      "Share comments, suggestions, and ideas to improve the RSAC-UP website and public services.",
    source: "https://rsac.up.gov.in/en/feedback",
    sections: [],
    links: [
      { label: "Contact RSAC-UP", path: "/contact" },
      { label: "Accessibility Statement", path: "/accessibility-statement" },
    ],
  },
  {
    slug: "tenders",
    title: "Tenders & Procurement",
    summary:
      "Procurement notices and the official Uttar Pradesh e-Tender portal for RSAC-UP tenders.",
    source: "https://rsac.up.gov.in/en/page/tenders",
    sections: [
      {
        heading: "Official e-Tender Portal",
        body:
          "RSAC-UP procurement and tender notices are published through the Government of Uttar Pradesh e-Tender portal. Bidders and vendors should monitor the portal for active tenders, corrigenda, and award information.",
      },
      {
        heading: "U.P. e-Tender Portal",
        body:
          "Visit the Uttar Pradesh e-Tender portal for live tenders, registration, document download, and bid submission workflows.",
        externalUrl: "https://etender.up.nic.in",
      },
      {
        heading: "Tender Enquiries",
        body: `For tender-related correspondence, contact RSAC-UP through the Director office at ${contactDetails.phone} or ${contactDetails.email}, clearly mentioning the tender reference number.`,
      },
      {
        heading: "Notices on this Website",
        body:
          "Recruitment advertisements, circulars, and downloadable notices published by RSAC-UP are also listed in the Notices section of this website.",
      },
    ],
    links: [
      { label: "View Notices", path: "/notices" },
      { label: "Contact RSAC-UP", path: "/contact" },
    ],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    summary: "",
    source: "https://rsac.up.gov.in/en/page/faq",
    sections: [
      {
        heading: "Question 1: Director's Compulsory Liability and Rights",
        body: [
          "<p>The director of the centre is the post as the Head of the Department and is entitled to all the powers of the Head of the Department. The director is appointed by the Chairman of the General Body on the recommendation of the Chairman of the Governing Body. The Chairman of the General Body is the appointing authority of the director.</p>",
          "<p>The director is the member secretary of the Governing Body. The main rights and liabilities of the director are as follows:</p>",
          "<ul><li>Discharge all administrative, financial, and technical obligations of the Centre.</li><li>Convene meetings of the Governing Body and present policy matters of the Centre.</li><li>Ensure compliance with decisions taken by the Governing Body.</li><li>Guide, arrange, and monitor implementation of the Centre's projects.</li><li>Constitute committees for smooth operation, decide on their recommendations, and review their proceedings.</li><li>Act as appointing and disciplinary authority for scientists in the scientific cadre.</li><li>Act as appointing and disciplinary authority for administrative and assistant technical personnel.</li><li>Approve leave and travel schedules of all heads.</li><li>Coordinate with the Government of Uttar Pradesh at different levels.</li><li>Proceed according to the General Service Rules.</li></ul>",
        ].join(""),
      },
      {
        heading: "Question 2: Sample formats for generation of geo-referenced data/Map, diversion of forest land for non-forestry purposes (under the Forest (Conservation) Act, 1980).",
        documents: [
          {
            title: "Sample formats for generation of geo-referenced data/Map",
            url: "/official-media/siteContent/faq/201808231536565467GDGNF_format_090218.pdf",
            meta: "Size: 1.46 MB | Language: English",
          },
        ],
      },
      {
        heading: "Question 3: Chief Secretary's Order; Remote Sensing, GIS & GPS related technologies work by Remote Sensing Applications Centre U.P.",
        documents: [
          {
            title: "Chief Secretary's Order - 14-09-2023",
            url: "/official-media/siteContent/faq/202309141059266354Remote-Sensing-GIS-GPS-Technique.pdf",
            meta: "Date: 14-09-2023 | Language: English",
          },
          {
            title: "Chief Secretary's Order - 18-12-2018",
            url: "/official-media/siteContent/faq/202303101531269500Adobe-Scan-Mar-10-2023.pdf",
            meta: "Date: 18-12-2018 | Language: English",
          },
          {
            title: "Chief Secretary's Order - 25-01-2016",
            url: "/official-media/siteContent/faq/20200122172906532625-01-2016_220120.pdf",
            meta: "Date: 25-01-2016 | Language: English",
          },
          {
            title: "Chief Secretary's Order - 05-08-2013",
            url: "/official-media/siteContent/faq/20200122172906532605-08-2013_220120.pdf",
            meta: "Date: 05-08-2013 | Language: English",
          },
          {
            title: "Chief Secretary's Order - 17-09-2004",
            url: "/official-media/siteContent/faq/20200122172906517017-09-2004_220120.pdf",
            meta: "Date: 17-09-2004 | Language: English",
          },
          {
            title: "Chief Secretary's Order - 25-09-2000",
            url: "/official-media/siteContent/faq/20200122172906501325-09-2000_220120.pdf",
            meta: "Date: 25-09-2000 | Language: English",
          },
        ],
      },
      {
        heading: "Question 4: Scientist's Seniority List.",
        documents: [
          {
            title: "Scientists' Seniority List - 13-09-2023",
            url: "/official-media/siteContent/faq/202405131456216687seniority-list.pdf",
            meta: "Date: 13-09-2023 | Language: Hindi",
          },
        ],
      },
      {
        heading: "Question 5: Who will provide the services of Personnel to RSAC-UP?",
        body: [
          "<p><strong>Vanshika HR Services Private Limited</strong></p>",
          "<p>7 & 8, Second Floor, Rani Saltanat Plaza,<br>Hazratganj, Lucknow-226001</p>",
          "<p>vanshikahrservices@gmail.com<br>www.vanshikahr.in</p>",
          "<p>Office (11:00 AM to 7:00 PM); Contact no. +91-9120002814<br>Mr. Indrajeet Singh, Manager; Contact no. +91-9307945418</p>",
        ].join(""),
      },
      {
        heading: "Question 6: What are the provisions and objectives of India's most recent National Geospatial Policy?",
        documents: [
          {
            title: "National Geospatial Policy-2022",
            url: "/official-media/siteContent/faq/202512221637247612National-Geospatial-Policy-2022.pdf",
            meta: "Size: 1.56 MB | Language: Hindi/English",
          },
        ],
      },
      {
        heading: "Question 7: What are the Survey of India's recommended and guiding tender specifications for surveying activities such as drone operations, GNSS surveys, and related geospatial data acquisition?",
        documents: [
          {
            title: "Survey of India",
            url: "/official-media/siteContent/faq/202512221549121876SURVEY-OF-INDIA.pdf",
            meta: "Size: 254 kB | Language: English",
          },
        ],
      },
    ],
    links: [
      { label: "Geo-Portal Services", path: "/geoportals" },
      { label: "Right to Information (RTI)", path: "/rti" },
      { label: "Contact RSAC-UP", path: "/contact" },
    ],
  },
];

export const getPublicInfoBySlug = (slug) =>
  publicInfoPages.find((page) => page.slug === slug);
