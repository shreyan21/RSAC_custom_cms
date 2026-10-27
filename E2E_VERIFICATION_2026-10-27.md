# End-to-end verification: 27 October 2026

Project: D:\RSAC_custom_cms. This is the custom React CMS project. The older Directus workspace was not the application under review.

## Outcome and changes

The checked CMS, public content and editor flows passed after the small fixes below. This is evidence for the listed checks, not a guarantee that no other defect exists.

| Reproduced issue | Fix |
| --- | --- |
| Tab could leave the full-screen organisation chart, and closing did not return keyboard focus to its opener. | Reused the existing modal-focus hook for focus containment, Escape, focus return and scroll restoration. |
| Clicking Open full chart with no published chart roles locked the page's scrolling while no dialog appeared. | Disabled the unavailable action and tied the scroll lock to a visible chart dialog. |
| The official-content audit ignored .env.local and fell back to localhost:3000, which can fail despite a healthy configured API. | Load the project's environment settings, consistently with the other CMS audit scripts. |

Only one public page component changed. No redesign or content cleanup was performed. Existing editor ownership, shared page bodies, upload validation and data model were retained. Two regression scenarios were added to npm run test:ui. The new scenarios fail against the previous source and pass against the corrected source; the original six also pass.

## Checks and results

| Check | Result |
| --- | --- |
| Full isolated CMS verification | All 31 checks passed, including both production builds. |
| Public mounted route walk | 144 route/language combinations passed using registered routes and published CMS pages; no render exceptions or unexpected placeholder fall-through. |
| Mounted CMS navigation | All 46 accessible editing areas opened and returned to the dashboard using the real isolated API. |
| Mounted UI interactions | Eight scenarios passed: gallery navigation/empty states, dialogs, search, optional storage, font controls, content-cache failures and organisation chart. |
| Rich-text editors | English/Hindi save/reopen, lists, tables, formatting, undo/redo, media, immediate saves and quote commands passed. |
| Upload editors | Pending uploads and save coordination, replacement/removal and stable item identity passed. |
| Real photo API | Scientist, technical staff, administration and organisation-role JPEG/PNG upload, retrieval, save/reopen and English/Hindi publication passed. MIME extensions were checked. |
| Invalid photo and duplicate checks | A PDF submitted as a portrait returned 415 with no orphan. Distinct people may share a photo; true duplicate identity fields remain blocked. |
| Shared page content and access | Canonical Training/School body edits reached both routes. Alias body writes were rejected. Academic-only permissions and standalone create/list/publish passed. |
| Preview and content delivery | Bilingual separation, draft visibility, existing preview refresh, public content version updates and restoration passed. |
| Feedback | Validation, database storage and authorised CMS visibility passed with outgoing email disabled. |
| Documents | Flood archive check passed for 2,290 local PDFs across 11 years; official-document coverage passed. |
| Production delivery | API, website root/deep link, CMS and compiled assets passed on a temporary port. |
| Static checks | Baseline full ESLint and focused ESLint for the delivered code/test changes passed. |

## How the live application was protected

At the start of this review the original website, CMS and API ports refused connections. The database was available. A private database snapshot was taken without running backup rotation, then copied into a new QA database. Tests used localhost:3100, a separate upload directory and disabled outgoing email. All test content, users, uploads and feedback were created in that environment.

Before applying changes, source hashes were compared with the starting snapshot to detect concurrent edits. Original versions of each changed file were saved privately. The running service stack was not stopped for this review; it was already offline. It was started after validation at the usual website :5173, CMS :5174 and API :3000 addresses. Final HTTP and database-content checks are recorded in the private audit result.

The original cms_entries, cms_media and cms_users contents were compared with their initial hashes. The review does not require any content migration, account reset, database restore or upload-directory replacement.

## Final checks after installation

- Website http://192.168.100.64:5173/ and CMS http://192.168.100.64:5174/ returned HTTP 200.
- API health, content version and both English/Hindi bootstrap responses returned HTTP 200.
- 396 published local media/document URLs returned HTTP 200 and a non-HTML content type, so a missing file was not mistaken for the SPA fallback.
- The original 2590 content records, 31 media records and 2 user records matched their starting hashes exactly.
- 3194 source/configuration files matched the approved release or starting hashes. The installed eight-scenario UI test passed again from the original project.
- The only application-code change is the chart component; the other code changes are its regression checks and the audit-script environment fix. Source changes are left uncommitted for normal review.

## Limits and remaining visual checks

Native browser inspection stopped because Computer Use could not verify the browser URL sufficiently to enforce its policy. No further browser UI input was issued. The mounted checks execute actual React code with simulated browser APIs; they do not measure CSS layout, phone breakpoints, image decoding, touch scrolling, video playback or browser popup behaviour. Real SMTP delivery was deliberately not tested.

Before a public release, manually check phone portrait/landscape, tablet and desktop in both languages. Open/close the menu, search, chart and gallery; try keyboard Tab/Escape, larger text and short viewports; check long tables/documents, upload progress and Preview in an actual browser; inspect its console and network panel. Record browser/version and viewport. Do not mark those visual checks complete based on this report.

The existing large CMS JavaScript chunk notice remains informational. No dependency upgrades, bundle restructuring or unrelated refactoring were made.

## Repeat and hand over

Start with [DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md) for setup, file locations, ownership rules, environment settings, backups and release steps. [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md) explains editor workflows.

- npm run test:ui needs no database and performs no API calls.
- npm run lint checks source rules.
- npm run cms:verify-all must use an isolated database, isolated uploads and disabled email: some checks temporarily write records.
- npm run cms:audit-official-core now reads CMS_API_URL from .env.local.
- npm run smoke:production requires both builds and an isolated configured database. Its temporary server must run from a normal directory: Express sendFile rejects an index under a hidden parent such as .cms-qa. The production smoke in this review used a normal private fixture directory and unchanged server source.

Detailed source hashes, private originals, database snapshot and test logs were retained locally in D:\rsac_website\.cms-qa\e2e-2026-10-27. That folder contains sensitive database material: transfer it privately only if needed; never commit it. These paths describe this audit computer, not a deployment dependency.
