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
    slug: "feedback",
    title: "Feedback",
    summary:
      "Share comments, suggestions, and ideas to improve the RSAC-UP website and public services.",
    source: "https://rsac.up.gov.in/en/page/en-feedback",
    sections: [
      {
        heading: "Website Feedback",
        body:
          "Visitors are encouraged to share feedback on navigation, accessibility, content clarity, downloads, and overall usability of the RSAC-UP website. Feedback helps the centre maintain a GIGW-aligned and citizen-friendly digital presence.",
      },
      {
        heading: "What to Include",
        body:
          "Please mention the page URL or section name, the device and browser used if relevant, and a short description of the issue or suggestion. For scientific or project-related queries, use the division or contact routes instead of this feedback channel.",
      },
      {
        heading: "Submit Feedback",
        body: `Email your feedback to ${contactDetails.email} with the subject line "Website Feedback". For training, project, or academic enquiries, contact the relevant officer listed on the Contact page.`,
      },
      {
        heading: "Response",
        body:
          "Actionable feedback related to website content, accessibility, or navigation is reviewed by the Web Information Manager and the website support team. RSAC-UP aims to respond to valid public feedback in a reasonable time frame.",
      },
    ],
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
    summary:
      "Common questions about RSAC-UP services, data requests, recruitment, and geospatial policy.",
    source: "https://rsac.up.gov.in/en/page/faq",
    sections: [
      {
        heading: "What does RSAC-UP do?",
        body:
          "Remote Sensing Applications Centre, Uttar Pradesh applies satellite remote sensing, GIS, and GPS to agriculture, water, forests, land use, urban survey, and disaster management for government departments of Uttar Pradesh.",
      },
      {
        heading: "How can I request geo-referenced data or maps?",
        body:
          "Departments and institutions may request geo-referenced data, thematic maps, and project support by writing to the Director office. Use the Geo-Portal directory for self-service datasets and map services.",
      },
      {
        heading: "Who provides manpower and HR services to RSAC-UP?",
        body:
          "Personnel and HR services are provided through Vanshika HR Services Private Limited, Lucknow.",
      },
      {
        heading: "What is the National Geospatial Policy?",
        body:
          "The National Geospatial Policy lays down the framework, objectives, and guidelines for acquiring, producing, and sharing geospatial data in India, enabling open access and a strong domestic geospatial ecosystem.",
      },
      {
        heading: "Where can I find the seniority list of scientists?",
        body:
          "The scientists' seniority list and related establishment orders are published as official documents in the Notices section of this website.",
      },
      {
        heading: "How do I file an RTI request or contact the centre?",
        body:
          "RTI applications can be submitted to the Public Information Officer. See the RTI page for the process, and the Contact page for address, phone, and email.",
      },
      {
        heading: "Organisation Details",
        body:
          "Company Name: Remote Sensing Applications Centre, U.P. PAN: AABAR0170L. TAN: LKNR05718G. GSTIN: 09AABAR0170L1ZG.",
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
