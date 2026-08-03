# Libraries Used by the RSAC-UP Project

This file shows which library is responsible for each major part of the website, CMS, API, and database work. It is a reference for maintenance; website text and records still come from the CMS/PostgreSQL database.

## Main Application Structure

| Part | Main libraries | Purpose |
| --- | --- | --- |
| Public website | React, React DOM | Builds all website pages and reusable components. |
| CMS portal | React, React DOM | Builds the editor dashboard, forms, previews, users, and permissions. |
| Page navigation | React Router DOM | Opens routes without reloading the complete React application. |
| Development and build | Vite, `@vitejs/plugin-react` | Runs ports 5173 and 5174 in development and creates production builds. |
| Styling | Tailwind CSS and normal CSS | Tailwind is used mainly by the public website; `src/index.css`, `src/civic-atlas.css`, and `admin/src/styles.css` contain the project styles. |
| Icons | Lucide React | Supplies the website and CMS icons. CMS-selectable icons are mapped in `src/components/icons/cmsIconRegistry.js`. |
| English fonts | Inter and Plus Jakarta Sans Fontsource packages | Keeps fonts local instead of loading them from an external website. |
| Hindi font | Noto Sans Devanagari Fontsource package | Keeps Hindi/Devanagari text readable and local. |

## Public Website Sections

All rows below use React. The extra libraries column lists the important additional library or browser feature for that area.

| Website area | Main file or folder | Extra libraries or features |
| --- | --- | --- |
| Website routes and page loading | `src/App.jsx` | React Router DOM, React lazy loading, Framer Motion configuration. |
| Header, top bar, menu, and language controls | `src/components/navbar/` | React Router DOM and Lucide React. |
| Footer | `src/components/layout/Footer.jsx` | React Router DOM and Lucide React. |
| Hero text, portraits, metrics, and video | `src/components/hero/` | Framer Motion, Lucide React, native HTML video, browser visibility and connection APIs. |
| Homepage announcements | `src/components/sections/AnnouncementTicker.jsx` | React Router DOM and Lucide React. |
| Homepage About section | `src/components/sections/AboutSection.jsx` | Framer Motion, React Router DOM, and Lucide React. |
| Homepage services and programme cards | `src/components/sections/ServicesSection.jsx` | Framer Motion, React Router DOM, and CMS icon registry. |
| Homepage operational domains | `src/components/sections/MissionPulse.jsx` | Framer Motion, React Router DOM, and CMS icon registry. |
| Homepage officials and notices | `src/components/sections/CommandCenter.jsx` | React, React Router DOM, Lucide React, and reduced-motion support. |
| Homepage statistics | `src/components/sections/GeoStats.jsx` and `src/components/motion/CountUp.jsx` | Framer Motion for counting and viewport detection. |
| Homepage geoportals | `src/components/sections/GeoportalSection.jsx` | Framer Motion, Lucide React, and CMS icon registry. |
| Homepage mobile applications | `src/components/sections/MobileAppsGrid.jsx` | Lucide React and CMS icon registry. |
| Homepage quick links | `src/components/sections/QuickAccess.jsx` | React Router DOM, Lucide React, and CMS icon registry. |
| Homepage gallery preview | `src/components/sections/HomeGalleryPreview.jsx` | Framer Motion, React Router DOM, and Lucide React. |
| Location and contact map | `src/components/location/RsacLocationMap.jsx` | Lucide React and normal map links; no third-party map SDK is required. |
| Shared page heading, breadcrumbs, and CMS route blocks | `src/components/layout/PageShell.jsx` | React Router DOM and Framer Motion through shared reveal components. |
| Divisions, facilities, academics, and imported official content | `src/pages/OfficialContentPage.jsx` | React Router DOM, Lucide React, sanitized CMS HTML, native image/video/PDF rendering. |
| Division directory | `src/pages/about/DivisionsPage.jsx` | Uses the shared official-content page components. |
| People and profile pages | `src/pages/people/` | Lucide React and shared profile cards. |
| Profile cards | `src/components/cards/ProfileFlipCard.jsx` | Lucide React; content and photographs come from CMS data. |
| Organisation chart | `src/pages/about/OrganisationChartPage.jsx` and `src/components/organisation/OrganisationChartDiagram.jsx` | React and Lucide React. |
| Geoportal directory | `src/pages/GeoportalsPage.jsx` | Lucide React and CMS icon registry. |
| Mobile applications page | `src/pages/MobileAppsPage.jsx` | Shared mobile-app grid and CMS icon registry. |
| Flood reports | `src/pages/public/FloodReportsPage.jsx` | React Router DOM, Lucide React, native PDF/document opening. |
| Gallery and lightbox | `src/pages/public/GalleryPage.jsx` and `src/components/media/Lightbox.jsx` | React DOM portals and Lucide React. |
| RTI, FAQ, tenders, feedback, memorandum, and service rules | `src/pages/public/PublicInfoPage.jsx` | React Router DOM, Lucide React, sanitized rich HTML, and the feedback form where required. |
| Feedback form | `src/components/public/FeedbackForm.jsx` | React form handling and the Express feedback API. |
| Policies, sitemap, and screen-reader page | `src/pages/policies/` | React Router DOM and CMS data hooks. |
| Notices and downloads | `src/pages/public/NoticesPage.jsx` and `src/pages/public/DownloadsPage.jsx` | Lucide React and native document opening. |
| Dark/light theme | `src/components/layout/ThemeController.jsx` | React and CSS custom properties. |
| Scroll progress and Back to Top | `src/components/layout/ScrollProgress.jsx` and `src/components/navigation/BackToTopButton.jsx` | React, browser scroll APIs, and Lucide React. |
| Read-aloud accessibility | `src/components/navigation/ReadAloudButton.jsx` | Browser Speech Synthesis API and Lucide React. |
| Motion and reveal effects | `src/components/motion/` | Framer Motion with reduced-motion checks. |

## CMS Portal Sections

| CMS area | Main file | Libraries or implementation |
| --- | --- | --- |
| Dashboard, collection lists, edit forms, users, and permissions | `admin/src/App.jsx` | React and Lucide React. |
| Collection grouping and names | `admin/src/cmsGroups.js` | Project configuration; no outside UI library. |
| Standard fields, uploads, settings, RTI sections, officers, and documents | `admin/src/FieldInput.jsx` | React, Lucide React, and the shared API client. |
| RTI and full-section rich-text editor | `admin/src/SectionRichTextEditor.jsx` | Tiptap React, Tiptap Core, Tiptap Starter Kit, Tiptap Table, and Lucide React. Starter Kit provides bold, italic, underline, strike, headings, lists, links, quotes, undo, and redo. A small project text-style mark provides safe selected-text foreground colour. |
| Rich-text tables | `admin/src/SectionRichTextEditor.jsx` | `@tiptap/extension-table` supplies table, row, header, and cell editing. |
| Editor hover explanations | `admin/src/EditorTooltipButton.jsx` | React IDs, accessible labels, tooltip text, and pressed-state reporting. |
| Short imported-line editor | `admin/src/InlineRichTextEditor.jsx` | React and the browser `contentEditable`/editing commands. This is separate from the Tiptap section editor and includes project code for safe selected-text foreground colour. |
| Flexible text, card, image, table, link, and divider blocks | `admin/src/BlockEditor.jsx` | React, Lucide React, rich-text editors, and upload components. |
| Division/facility/academic section workspace | `admin/src/DivisionContentWorkspace.jsx` | React, Lucide React, rich text, media editor, section ordering, and live preview. |
| Section list item management and ordering | `admin/src/SectionItemManager.jsx` | React and Lucide React. |
| Photos, videos, PDFs, and other imported media | `admin/src/ImportedAssetEditor.jsx` | React, Lucide React, browser file picker, and Express upload API. |
| Live preview | `admin/src/useLivePreview.js` | React hooks, API preview tokens, `postMessage`, and server-sent content update events. |
| CMS API calls | `admin/src/api.js` | Browser Fetch API, CSRF header handling, and local media URL conversion. |
| CMS visual design | `admin/src/styles.css` | Normal responsive CSS; no separate component-design library. |

## Express API and Database

| Server responsibility | Library | Main file |
| --- | --- | --- |
| HTTP API and static media routes | Express | `server/index.js` |
| PostgreSQL connection and queries | `pg` | `server/db.js` and server modules |
| Password hashing | `bcryptjs` | `server/auth.js`, `server/setup.js`, and `server/reset-admin.js` |
| Login cookies | `cookie-parser` | `server/index.js` |
| Security headers | Helmet | `server/index.js` |
| Request limits | `express-rate-limit` | `server/index.js` |
| Allowed website/CMS origins | CORS | `server/index.js` |
| Compressed API responses | Compression | `server/index.js` |
| Photo, PDF, video, and document uploads | Multer | `server/index.js` |
| Cleaning saved rich HTML | `sanitize-html` | `server/contentValidation.js` |
| Feedback email | Nodemailer | `server/feedbackMailer.js` |
| Environment settings | Dotenv | `server/config.js` and setup scripts |
| Collection fields and CMS rules | Project code | `shared/cmsCollections.js` |
| CMS permissions | Project code | `shared/cmsPermissions.js` |
| English/Hindi published data assembly | Project code | `server/contentAssembler.js` |
| Database tables and indexes | PostgreSQL SQL | `server/schema.sql` |

## Build, Checks, and Maintenance

| Tool | Use |
| --- | --- |
| ESLint | Checks React, JavaScript, and hooks for coding errors with `npm run lint`. |
| JSDOM | Provides a browser-like DOM for automated JavaScript checks when needed. |
| Vite production build | Creates the public website with `npm run build` and the CMS with `npm run build:admin`. |
| Project scripts | The `scripts/` folder contains CMS backup, restore, migration, parity, media, and content-audit commands. |

## Installed but Not Currently Used Directly

`lenis` is installed in `package.json`, but the current `SmoothScroll.jsx` deliberately uses native browser scrolling. It should not be described as controlling the live website unless it is imported again in the source code.

## Important Note About Content

Libraries control how the application works and looks. English/Hindi text, people, divisions, facilities, RTI sections, PDFs, photographs, ordering, visibility, headings, and most labels are stored in PostgreSQL and edited through the CMS. The React components read that CMS data through `src/contexts/DataContext.jsx`, `src/hooks/useData.js`, and `src/data/customCmsClient.js`.
